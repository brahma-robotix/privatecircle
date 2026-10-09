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
  token := encode(extensions.gen_random_bytes(32), 'hex');
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

CREATE POLICY "Admins can view profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can update safe profile fields"
ON public.profiles FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
REVOKE UPDATE (id, email, role, status, partner_id, created_at, updated_at)
ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, avatar_bg, bio, relationship_start_date, location_settings, privacy_settings)
ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE VIEW public.circle_directory
WITH (security_barrier = true)
AS
SELECT id, name, avatar_bg, bio, created_at
FROM public.profiles
WHERE status = 'active';
GRANT SELECT ON public.circle_directory TO authenticated;

-- Only the owner, an explicitly linked partner with sharing enabled, or an
-- active admin when the owner opted into partner_and_admin can read locations.
CREATE OR REPLACE VIEW public.shared_locations
WITH (security_barrier = true)
AS
SELECT p.id, p.name, p.avatar_bg, p.location_settings
FROM public.profiles p
WHERE p.id = (SELECT auth.uid())
   OR (
     coalesce((p.location_settings->>'enabled')::boolean, false) = true
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
   );
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
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access required' USING ERRCODE = '42501';
  END IF;
  IF new_role NOT IN ('admin', 'member') OR new_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid role or status';
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
SET search_path = public, private, pg_temp
AS $$
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

-- 7) Prevent joining arbitrary conversations by guessing their IDs.
DROP POLICY IF EXISTS "Users can join or be added to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join circle group or be added by owner" ON public.conversation_participants;
CREATE POLICY "Admins or conversation creators can add participants"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
      AND c.created_by = (SELECT auth.uid())
  )
);

-- 8) Keep the attachment bucket private and restrict object reads to participants.
UPDATE storage.buckets
SET public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'video/mp4', 'video/webm', 'video/quicktime',
      'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'
    ]
WHERE id = 'attachments';

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
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own attachment objects"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'attachments'
  AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Manual verification after applying in a staging project:
-- SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public';
-- SELECT * FROM storage.buckets WHERE id = 'attachments';
