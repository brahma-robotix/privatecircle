-- ==============================================================================
-- PrivateCircle Security Hardening
-- Apply only after reviewing in a staging project and taking a database backup.
-- This migration does not deploy itself; it must be applied in Supabase SQL Editor.
-- ==============================================================================

-- 1) Private one-time bootstrap token for the very first administrator.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS private.admin_bootstrap_tokens (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
REVOKE ALL ON TABLE private.admin_bootstrap_tokens FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.create_admin_bootstrap_token(p_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  token text;
BEGIN
  IF p_email IS NULL OR position('@' IN p_email) < 2 THEN
    RAISE EXCEPTION 'A valid administrator email is required';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles) THEN
    RAISE EXCEPTION 'Bootstrap is only available before the first profile exists';
  END IF;
  token := upper(encode(extensions.gen_random_bytes(32), 'hex'));
  INSERT INTO private.admin_bootstrap_tokens(token_hash, email)
  VALUES (encode(extensions.digest(token, 'sha256'), 'hex'), lower(btrim(p_email)));
  RETURN token;
END;
$$;
REVOKE ALL ON FUNCTION private.create_admin_bootstrap_token(text) FROM PUBLIC, anon, authenticated;
-- The database owner can call this in SQL Editor to provision the first admin.
-- SELECT private.create_admin_bootstrap_token('admin@example.com');

-- 2) Admin checks use a fixed search_path and are not publicly callable.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
      AND p.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 3) Replace profile-wide reads with owner/admin reads and a limited directory.
DROP POLICY IF EXISTS "Users can view circle profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update roles and status" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- Administrators use the column-limited admin_directory view instead of reading private profile fields.

CREATE POLICY "Users can update safe profile fields"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

REVOKE UPDATE ON TABLE public.profiles FROM PUBLIC, anon, authenticated;
REVOKE UPDATE (id, email, role, status, partner_id, created_at, updated_at)
ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, avatar_bg, bio, relationship_start_date, location_settings, privacy_settings)
ON TABLE public.profiles TO authenticated;

-- Shared active-account predicate used by RLS policies and privacy-safe views.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
  );
$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

CREATE OR REPLACE VIEW public.circle_directory
WITH (security_barrier = true)
AS
SELECT id, name, avatar_bg, bio, created_at
FROM public.profiles
WHERE status = 'active' AND public.is_active_user();
GRANT SELECT ON public.circle_directory TO authenticated;

-- Admin-only member management view excludes location and privacy JSON entirely.
CREATE OR REPLACE VIEW public.admin_directory
WITH (security_barrier = true)
AS
SELECT id, email, name, role, status, avatar_bg, bio, created_at
FROM public.profiles
WHERE public.is_admin();
GRANT SELECT ON public.admin_directory TO authenticated;

-- Only the owner, an explicitly linked partner with sharing enabled, or an
-- active admin when the owner opted into partner_and_admin can read locations.
CREATE OR REPLACE VIEW public.shared_locations
WITH (security_barrier = true)
AS
SELECT p.id, p.name, p.avatar_bg, p.location_settings
FROM public.profiles p
WHERE public.is_active_user()
  AND (p.id = (SELECT auth.uid())
   OR (
     p.location_settings->>'enabled' = 'true'
     AND (
       (
         p.location_settings->>'audience' IN ('partner', 'partner_and_admin')
         AND EXISTS (
           SELECT 1 FROM public.profiles me
           WHERE me.id = (SELECT auth.uid())
             AND (me.partner_id = p.id OR p.partner_id = me.id)
         )
       )
       OR (
         p.location_settings->>'audience' = 'partner_and_admin'
         AND public.is_admin()
       )
     )
   ));
GRANT SELECT ON public.shared_locations TO authenticated;

-- 4) Invitation records/codes are private. Verification returns only a boolean.
DROP POLICY IF EXISTS "Anyone can verify an invitation code" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view and manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.verify_invitation_code(p_code text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  clean_code text := upper(btrim(coalesce(p_code, '')));
  clean_email text := lower(btrim(coalesce(p_email, '')));
BEGIN
  IF clean_code = '' OR clean_email = '' THEN
    RETURN false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    RETURN EXISTS (
      SELECT 1 FROM private.admin_bootstrap_tokens t
      WHERE t.token_hash = encode(extensions.digest(clean_code, 'sha256'), 'hex')
        AND t.email = clean_email
        AND t.used_at IS NULL
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.invitations i
    WHERE i.code = clean_code
      AND lower(btrim(i.email)) = clean_email
      AND i.status = 'pending'
      AND (i.expires_at IS NULL OR i.expires_at > now())
  );
END;
$$;
REVOKE ALL ON FUNCTION public.verify_invitation_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation_code(text, text) TO anon, authenticated;

-- 5) Admin role/status changes must go through a server-checked RPC.
CREATE OR REPLACE FUNCTION public.admin_update_profile_access(
  target_user_id uuid,
  new_role text,
  new_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF new_role NOT IN ('admin', 'member') OR new_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid role or status';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = target_user_id AND p.role = 'admin' AND p.status = 'active'
  )
  AND (new_role <> 'admin' OR new_status <> 'active')
  AND (
    SELECT count(*) FROM public.profiles p
    WHERE p.role = 'admin' AND p.status = 'active'
  ) <= 1 THEN
    RAISE EXCEPTION 'Cannot disable or demote the last active administrator';
  END IF;
  UPDATE public.profiles
  SET role = new_role, status = new_status
  WHERE id = target_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_profile_access(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_profile_access(uuid, text, text) TO authenticated;

-- 6) Enforce invite-only signup at the database trigger, so clients cannot bypass it.
-- The first account must present a one-time bootstrap token generated by the DB owner.
-- Later accounts must present a valid, email-bound invitation code.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $
DECLARE
  user_name text;
  invite_code text := upper(btrim(coalesce(new.raw_user_meta_data->>'invite_code', '')));
  claimed_invitation uuid;
  claimed_bootstrap text;
  assigned_role text := 'member';
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('privatecircle-admin-bootstrap'));

  IF NOT EXISTS (SELECT 1 FROM public.profiles) THEN
    UPDATE private.admin_bootstrap_tokens t
    SET used_at = now()
    WHERE t.token_hash = encode(extensions.digest(invite_code, 'sha256'), 'hex')
      AND t.email = lower(btrim(coalesce(new.email, '')))
      AND t.used_at IS NULL
    RETURNING t.token_hash INTO claimed_bootstrap;

    IF claimed_bootstrap IS NULL THEN
      RAISE EXCEPTION 'A valid one-time administrator bootstrap token is required';
    END IF;
    assigned_role := 'admin';
  ELSE
    UPDATE public.invitations i
    SET status = 'approved'
    WHERE i.code = invite_code
      AND lower(btrim(i.email)) = lower(btrim(coalesce(new.email, '')))
      AND i.status = 'pending'
      AND (i.expires_at IS NULL OR i.expires_at > now())
    RETURNING i.id INTO claimed_invitation;

    IF claimed_invitation IS NULL THEN
      RAISE EXCEPTION 'Invitation is invalid, expired, already used, or assigned to another email';
    END IF;
  END IF;

  user_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (new.id, lower(btrim(new.email)), user_name, assigned_role, 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = coalesce(EXCLUDED.name, public.profiles.name);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7) Use a database-owned flag for the canonical circle group. A name is not
-- an authorization boundary because users can create groups with arbitrary names.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_circle boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_privatecircle_group
ON public.conversations (is_circle)
WHERE is_circle = true;

UPDATE public.conversations
SET is_circle = true
WHERE id = (
  SELECT c.id FROM public.conversations c
  WHERE c.type = 'group' AND c.name = 'Our Inner Circle'
  ORDER BY c.created_at
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM public.conversations WHERE is_circle = true);

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create ordinary conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND is_circle = false
);
CREATE POLICY "Admins can create circle conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND is_circle = true
  AND public.is_admin()
);

DROP POLICY IF EXISTS "Users can join or be added to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join circle group or be added by owner" ON public.conversation_participants;
DROP POLICY IF EXISTS "Admins or conversation creators can add participants" ON public.conversation_participants;
CREATE POLICY "Authorized circle membership"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND c.created_by = (SELECT auth.uid())
  )
  OR (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND c.is_circle = true AND c.type = 'group'
    )
  )
);

-- 8) Keep the attachment bucket private and restrict object reads to participants.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  false,
  52428800,
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authenticated users can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload attachments to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachments" ON storage.objects;
DROP POLICY IF EXISTS "Conversation participants can view attachment objects" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own attachment objects" ON storage.objects;

CREATE POLICY "Conversation participants can view attachment objects"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1
    FROM public.attachments a
    JOIN public.messages m ON m.id = a.message_id
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE a.file_path = storage.objects.name
      AND cp.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Users can upload attachments to their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'attachments'
  AND public.is_active_user()
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own attachment objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND public.is_active_user()
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Manual verification after applying in a staging project:
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public';
-- SELECT * FROM storage.buckets WHERE id = 'attachments';


-- 9) Require an active account for every sensitive data operation.
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid()) AND p.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- 10) Rebuild policies with active-account checks and explicit row ownership.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update safe profile fields" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_active_user() AND id = (SELECT auth.uid()));
CREATE POLICY "Users can update safe profile fields"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_active_user() AND id = (SELECT auth.uid()))
WITH CHECK (public.is_active_user() AND id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Admins can manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations FOR ALL TO authenticated
USING (public.is_active_user() AND public.is_admin())
WITH CHECK (public.is_active_user() AND public.is_admin());

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;
DROP POLICY IF EXISTS "Users can create ordinary conversations" ON public.conversations;
DROP POLICY IF EXISTS "Admins can create circle conversations" ON public.conversations;
DROP POLICY IF EXISTS "Active participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Active participants can view conversations"
ON public.conversations FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = public.conversations.id
        AND cp.user_id = (SELECT auth.uid())
    )
    OR (public.conversations.is_circle = true AND public.conversations.type = 'group')
  )
);
CREATE POLICY "Users can create ordinary conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND created_by = (SELECT auth.uid())
  AND is_circle = false
);
CREATE POLICY "Admins can create circle conversations"
ON public.conversations FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND created_by = (SELECT auth.uid())
  AND is_circle = true
  AND public.is_admin()
);
REVOKE UPDATE ON TABLE public.conversations FROM PUBLIC, anon, authenticated;
GRANT UPDATE (last_message, last_message_timestamp)
ON TABLE public.conversations TO authenticated;
CREATE POLICY "Active participants can update conversation preview"
ON public.conversations FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversations.id
      AND cp.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversations.id
      AND cp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Participants can view conversation members" ON public.conversation_participants;
DROP POLICY IF EXISTS "Authorized circle membership" ON public.conversation_participants;
CREATE POLICY "Active participants can view conversation members"
ON public.conversation_participants FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.conversation_participants.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Authorized circle membership"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.created_by = (SELECT auth.uid())
    )
    OR (
      user_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id AND c.is_circle = true AND c.type = 'group'
      )
    )
  )
);

DROP POLICY IF EXISTS "Participants can read messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can edit or delete own messages" ON public.messages;
DROP POLICY IF EXISTS "Senders can delete own messages" ON public.messages;
CREATE POLICY "Active participants can read messages"
ON public.messages FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Active participants can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
REVOKE UPDATE ON TABLE public.messages FROM PUBLIC, anon, authenticated;
GRANT UPDATE (text, is_edited, translated_text, original_text)
ON TABLE public.messages TO authenticated;
CREATE POLICY "Senders can update own message content"
ON public.messages FOR UPDATE TO authenticated
USING (
  public.is_active_user()
  AND sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.is_active_user()
  AND sender_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = public.messages.conversation_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Senders or admins can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (
  public.is_active_user()
  AND (
    sender_id = (SELECT auth.uid())
    OR public.is_admin()
  )
);

DROP POLICY IF EXISTS "Conversation participants can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Users can insert attachments for their messages" ON public.attachments;
DROP POLICY IF EXISTS "Uploaders can delete their attachments" ON public.attachments;
CREATE POLICY "Active conversation participants can view attachments"
ON public.attachments FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = public.attachments.message_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Users can attach files to own messages"
ON public.attachments FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND uploaded_by = (SELECT auth.uid())
  AND file_path LIKE ((SELECT auth.uid())::text || '/%')
  AND file_size_bytes BETWEEN 0 AND 52428800
  AND EXISTS (
    SELECT 1
    FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = public.attachments.message_id
      AND m.sender_id = (SELECT auth.uid())
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Uploaders can delete own attachments"
ON public.attachments FOR DELETE TO authenticated
USING (public.is_active_user() AND uploaded_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Participants can view reactions" ON public.message_reactions;
DROP POLICY IF EXISTS "Users can manage own reactions" ON public.message_reactions;
CREATE POLICY "Active participants can view reactions"
ON public.message_reactions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = public.message_reactions.message_id
      AND cp.user_id = (SELECT auth.uid())
  )
);
CREATE POLICY "Active participants can manage own reactions"
ON public.message_reactions FOR ALL TO authenticated
USING (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = public.message_reactions.message_id
      AND cp.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = public.message_reactions.message_id
      AND cp.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Couples can view their love notes" ON public.love_notes;
DROP POLICY IF EXISTS "Users can create love notes for their partner" ON public.love_notes;
DROP POLICY IF EXISTS "Authors can update love notes" ON public.love_notes;
DROP POLICY IF EXISTS "Authors can delete love notes" ON public.love_notes;
CREATE POLICY "Linked partners can view love notes"
ON public.love_notes FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    author_id = (SELECT auth.uid())
    OR (
      partner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = public.love_notes.author_id
          AND me.partner_id = (SELECT auth.uid())
      )
    )
  )
);
CREATE POLICY "Users can create notes for linked partner"
ON public.love_notes FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND author_id = (SELECT auth.uid())
  AND (
    partner_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.partner_id = public.love_notes.partner_id
    )
  )
);
CREATE POLICY "Authors can update own love notes"
ON public.love_notes FOR UPDATE TO authenticated
USING (public.is_active_user() AND author_id = (SELECT auth.uid()))
WITH CHECK (
  public.is_active_user()
  AND author_id = (SELECT auth.uid())
  AND (
    partner_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.partner_id = public.love_notes.partner_id
    )
  )
);
CREATE POLICY "Authors can delete own love notes"
ON public.love_notes FOR DELETE TO authenticated
USING (public.is_active_user() AND author_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Couples can view milestones" ON public.relationship_milestones;
DROP POLICY IF EXISTS "Users can manage milestones" ON public.relationship_milestones;
CREATE POLICY "Linked partners can view milestones"
ON public.relationship_milestones FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    user_id = (SELECT auth.uid())
    OR (
      partner_id = (SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = public.relationship_milestones.user_id
          AND me.partner_id = (SELECT auth.uid())
      )
    )
  )
);
CREATE POLICY "Users can manage own milestones"
ON public.relationship_milestones FOR ALL TO authenticated
USING (public.is_active_user() AND user_id = (SELECT auth.uid()))
WITH CHECK (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
  AND (
    partner_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.partner_id = public.relationship_milestones.partner_id
    )
  )
);

DROP POLICY IF EXISTS "Users can view visible memories" ON public.memories;
DROP POLICY IF EXISTS "Users can upload memories" ON public.memories;
DROP POLICY IF EXISTS "Uploaders can update or delete memories" ON public.memories;
CREATE POLICY "Active users can view authorized memories"
ON public.memories FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    uploaded_by = (SELECT auth.uid())
    OR visibility = 'circle'
    OR (
      visibility = 'partner'
      AND EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = (SELECT auth.uid())
          AND me.partner_id = public.memories.uploaded_by
      )
    )
  )
);
CREATE POLICY "Users can create own memories"
ON public.memories FOR INSERT TO authenticated
WITH CHECK (public.is_active_user() AND uploaded_by = (SELECT auth.uid()));
CREATE POLICY "Uploaders can update own memories"
ON public.memories FOR UPDATE TO authenticated
USING (public.is_active_user() AND uploaded_by = (SELECT auth.uid()))
WITH CHECK (public.is_active_user() AND uploaded_by = (SELECT auth.uid()));
CREATE POLICY "Uploaders can delete own memories"
ON public.memories FOR DELETE TO authenticated
USING (public.is_active_user() AND uploaded_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view visible calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Users can manage own calendar events" ON public.calendar_events;
CREATE POLICY "Active users can view authorized calendar events"
ON public.calendar_events FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (
    owner_id = (SELECT auth.uid())
    OR visibility = 'circle'
    OR (
      visibility = 'partner'
      AND EXISTS (
        SELECT 1 FROM public.profiles me
        WHERE me.id = (SELECT auth.uid())
          AND me.partner_id = public.calendar_events.owner_id
      )
    )
  )
);
CREATE POLICY "Users can manage own calendar events"
ON public.calendar_events FOR ALL TO authenticated
USING (public.is_active_user() AND owner_id = (SELECT auth.uid()))
WITH CHECK (public.is_active_user() AND owner_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Call participants can view call logs" ON public.call_logs;
DROP POLICY IF EXISTS "Call participants can insert call logs" ON public.call_logs;
CREATE POLICY "Active call participants can view logs"
ON public.call_logs FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND ((SELECT auth.uid()) = caller_id OR (SELECT auth.uid()) = receiver_id)
);
CREATE POLICY "Users can log calls involving themselves"
ON public.call_logs FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND caller_id = (SELECT auth.uid())
  AND (
    receiver_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = (SELECT auth.uid()) AND me.partner_id = public.call_logs.receiver_id
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants a
      JOIN public.conversation_participants b ON b.conversation_id = a.conversation_id
      WHERE a.user_id = (SELECT auth.uid())
        AND b.user_id = public.call_logs.receiver_id
    )
  )
);

DROP POLICY IF EXISTS "Users can manage own device sessions" ON public.user_device_sessions;
CREATE POLICY "Active users can manage own device sessions"
ON public.user_device_sessions FOR ALL TO authenticated
USING (public.is_active_user() AND user_id = (SELECT auth.uid()))
WITH CHECK (public.is_active_user() AND user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can view own location audit logs" ON public.location_audit_logs;
CREATE POLICY "Active users can view authorized location audit logs"
ON public.location_audit_logs FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND (user_id = (SELECT auth.uid()) OR public.is_admin())
);

-- Memory comments/reactions had RLS enabled but no policies. Grant only access
-- to users who can read the associated memory, with ownership for mutations.
CREATE POLICY "Users can view comments on visible memories"
ON public.memory_comments FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = public.memory_comments.memory_id
  )
);
CREATE POLICY "Users can comment on visible memories"
ON public.memory_comments FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND author_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = public.memory_comments.memory_id
  )
);
CREATE POLICY "Authors can delete own memory comments"
ON public.memory_comments FOR DELETE TO authenticated
USING (public.is_active_user() AND author_id = (SELECT auth.uid()));

CREATE POLICY "Users can view reactions on visible memories"
ON public.memory_reactions FOR SELECT TO authenticated
USING (
  public.is_active_user()
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = public.memory_reactions.memory_id
  )
);
CREATE POLICY "Users can react to visible memories"
ON public.memory_reactions FOR INSERT TO authenticated
WITH CHECK (
  public.is_active_user()
  AND user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.memories m
    WHERE m.id = public.memory_reactions.memory_id
  )
);
CREATE POLICY "Users can remove own memory reactions"
ON public.memory_reactions FOR DELETE TO authenticated
USING (public.is_active_user() AND user_id = (SELECT auth.uid()));
