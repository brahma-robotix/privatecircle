-- ==============================================================================
-- PrivateCircle Security Hardening (apply after the base schema)
-- Review in staging before production. This script is intentionally re-runnable.
-- ==============================================================================
-- 1) Admin checks must use a fixed search_path and must not be publicly callable.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.role = 'admin'
      AND p.status = 'active'
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2) Restrict direct profile reads to the account owner and admins.
-- A safe directory view below exposes only non-sensitive fields to members.
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

-- Remove table-level update rights, then grant only non-privileged columns.
REVOKE UPDATE ON TABLE public.profiles FROM anon, authenticated;
REVOKE UPDATE (id, email, role, status, partner_id, created_at, updated_at)
ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (name, avatar_bg, bio, relationship_start_date, location_settings, privacy_settings)
ON TABLE public.profiles TO authenticated;

-- Public-to-circle directory view deliberately excludes email, role, status,
-- relationship links, precise location, and privacy settings.
CREATE OR REPLACE VIEW public.circle_directory
WITH (security_barrier = true)
AS
SELECT id, name, avatar_bg, bio, created_at
FROM public.profiles
WHERE status = 'active';
GRANT SELECT ON public.circle_directory TO authenticated;

-- 3) Never expose invitation rows or codes through the Data API.
DROP POLICY IF EXISTS "Anyone can verify an invitation code" ON public.invitations;
DROP POLICY IF EXISTS "Admins can view and manage invitations" ON public.invitations;
CREATE POLICY "Admins can manage invitations"
ON public.invitations FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.verify_invitation_code(p_code text, p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.invitations i
    WHERE i.code = upper(btrim(coalesce(p_code, '')))
      AND lower(btrim(i.email)) = lower(btrim(coalesce(p_email, '')))
      AND i.status = 'pending'
      AND (i.expires_at IS NULL OR i.expires_at > now())
  );
$$;
REVOKE ALL ON FUNCTION public.verify_invitation_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_invitation_code(text, text) TO anon, authenticated;

-- 4) Admin role/status changes must go through this checked RPC, never direct UPDATE.
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

-- 5) Signup must include a valid, email-bound invitation. The invite is consumed
-- atomically in the trigger so direct calls to Supabase Auth cannot bypass it.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_name text;
  invite_code text;
  claimed_invitation uuid;
BEGIN
  invite_code := upper(btrim(coalesce(new.raw_user_meta_data->>'invite_code', '')));
  IF invite_code = '' OR new.email IS NULL THEN
    RAISE EXCEPTION 'A valid invitation is required to create a PrivateCircle account';
  END IF;

  UPDATE public.invitations i
  SET status = 'approved'
  WHERE i.code = invite_code
    AND lower(btrim(i.email)) = lower(btrim(new.email))
    AND i.status = 'pending'
    AND (i.expires_at IS NULL OR i.expires_at > now())
  RETURNING i.id INTO claimed_invitation;

  IF claimed_invitation IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid, expired, already used, or assigned to another email';
  END IF;

  user_name := coalesce(nullif(btrim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1));
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (new.id, lower(btrim(new.email)), user_name, 'member', 'active')
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = coalesce(EXCLUDED.name, public.profiles.name);
  RETURN new;
END;
$$;

-- Existing trigger is replaced to use the invitation-enforcing function.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6) A user may join only the designated circle group; arbitrary direct chats
-- cannot be joined by guessing a conversation UUID.
DROP POLICY IF EXISTS "Users can join or be added to conversations" ON public.conversation_participants;
CREATE POLICY "Users can join circle group or be added by owner"
ON public.conversation_participants FOR INSERT TO authenticated
WITH CHECK (
  public.is_admin()
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = conversation_id
      AND c.created_by = (SELECT auth.uid())
  )
  OR (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND c.type = 'group'
        AND c.name = 'Our Inner Circle'
    )
  )
);

-- 7) Storage objects are readable only when linked to a message in a conversation
-- the caller participates in. Keep the bucket private.
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

-- 8) Verification queries: these should return no broad policies listed above.
-- SELECT policyname, tablename FROM pg_policies
-- WHERE schemaname = 'public' AND policyname IN
-- ('Users can view circle profiles', 'Anyone can verify an invitation code',
--  'Users can join or be added to conversations');
