-- ==============================================================================
-- PrivateCircle: Production PostgreSQL Database Schema & Security Architecture
-- ==============================================================================
-- Designed for Supabase: Invite-Only Couple & Private Circle Communication App
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/bbbkznpyrxkrpbpeqkpg
-- 2. Navigate to "SQL Editor" in the left sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USER PROFILES & ACCOUNTS (Synced with Supabase Auth)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'Circle Member',
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  avatar_bg TEXT NOT NULL DEFAULT '#6366f1',
  bio TEXT DEFAULT '',
  partner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  relationship_start_date DATE,
  location_settings JSONB NOT NULL DEFAULT '{"enabled": false, "audience": "off", "duration": "always"}'::jsonb,
  privacy_settings JSONB NOT NULL DEFAULT '{"whoCanContact": "circle", "profileVisibility": "circle", "onlineStatusVisibility": "circle", "lastSeenVisibility": "circle", "exactLocationEnabled": false, "approximateLocationEnabled": true, "allowedLocationUserIds": [], "externalTranslationConsent": false, "automaticTranslationEnabled": false, "discreetNotificationPreviews": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast user searches and relationship lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_partner ON public.profiles(partner_id);

-- ==============================================================================
-- 3. INVITATIONS (Invite-Only Registration System)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);

-- ==============================================================================
-- 4. CONVERSATIONS & CIRCLE GROUPS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message TEXT DEFAULT '',
  last_message_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

-- Conversation participants junction table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conv ON public.conversation_participants(conversation_id);

-- ==============================================================================
-- 5. MESSAGES & CHAT FEATURES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  reply_to_id UUID,
  reply_to_preview JSONB,
  is_edited BOOLEAN NOT NULL DEFAULT false,
  translated_text TEXT,
  original_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- Attachments (Photos, Voice Notes, Videos <60s)
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'audio')),
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  duration_seconds NUMERIC,
  original_filename TEXT DEFAULT '',
  waveform INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attachments_msg ON public.attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(uploaded_by);

-- Message Reactions (Emoji -> Users)
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_reactions_msg ON public.message_reactions(message_id);

-- ==============================================================================
-- 6. RELATIONSHIP & COUPLE FEATURES
-- ==============================================================================
-- Love Notes
CREATE TABLE IF NOT EXISTS public.love_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_love_notes_couple ON public.love_notes(author_id, partner_id);

-- Relationship Milestones & Special Dates
CREATE TABLE IF NOT EXISTS public.relationship_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  icon TEXT NOT NULL DEFAULT '❤️',
  category TEXT NOT NULL CHECK (category IN ('firsts', 'trips', 'anniversary', 'special')),
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_date ON public.relationship_milestones(date DESC);

-- ==============================================================================
-- 7. MEMORIES & PHOTO VAULT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  title TEXT DEFAULT '',
  description TEXT DEFAULT '',
  location_label TEXT DEFAULT '',
  people_included TEXT[] DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'partner' CHECK (visibility IN ('private', 'partner', 'circle', 'group')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  album TEXT NOT NULL DEFAULT 'All',
  duration_seconds NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_album ON public.memories(album);
CREATE INDEX IF NOT EXISTS idx_memories_date ON public.memories(date DESC);

-- Memory Comments
CREATE TABLE IF NOT EXISTS public.memory_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_comments_mem ON public.memory_comments(memory_id);

-- Memory Reactions
CREATE TABLE IF NOT EXISTS public.memory_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id, emoji)
);

-- ==============================================================================
-- 8. CALENDAR & COUNTDOWNS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  description TEXT DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('birthday', 'anniversary', 'travel', 'meeting', 'exam', 'reminder', 'custom')),
  reminder TEXT NOT NULL DEFAULT 'none' CHECK (reminder IN ('none', '1day', '1week', 'day_of')),
  visibility TEXT NOT NULL DEFAULT 'partner' CHECK (visibility IN ('private', 'partner', 'circle', 'group')),
  is_countdown BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON public.calendar_events(date ASC);

-- ==============================================================================
-- 9. CALL LOGS & DEVICE SESSIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video')),
  direction TEXT NOT NULL CHECK (direction IN ('outgoing', 'incoming')),
  status TEXT NOT NULL CHECK (status IN ('completed', 'missed')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  browser TEXT NOT NULL,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  approx_location TEXT DEFAULT '',
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Location Audit Logs (Ensures total transparency)
CREATE TABLE IF NOT EXISTS public.location_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('granted_admin', 'revoked_admin', 'started_sharing', 'stopped_sharing', 'viewed_by_admin')),
  details TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 10. TRIGGER FUNCTIONS & AUTOMATION
-- ==============================================================================

-- Helper function: Check if current user is an active admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Trigger: Automatically create public.profiles record when user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_name TEXT;
BEGIN
  user_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  INSERT INTO public.profiles (id, email, name, role, status)
  VALUES (
    new.id,
    new.email,
    user_name,
    CASE WHEN (SELECT count(*) FROM public.profiles) = 0 THEN 'admin' ELSE 'member' END,
    'active'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      name = coalesce(EXCLUDED.name, public.profiles.name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Updated at timestamp automation
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_messages_updated_at BEFORE UPDATE ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER trg_love_notes_updated_at BEFORE UPDATE ON public.love_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==============================================================================
-- 11. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.love_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PROFILES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view circle profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can update roles and status"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- INVITATIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Admins can view and manage invitations"
ON public.invitations FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Anyone can verify an invitation code"
ON public.invitations FOR SELECT
TO anon, authenticated
USING (status = 'pending' AND (expires_at IS NULL OR expires_at > now()));

-- ------------------------------------------------------------------------------
-- CONVERSATIONS & PARTICIPANTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view conversations they participate in"
ON public.conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Participants can view conversation members"
ON public.conversation_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can join or be added to conversations"
ON public.conversation_participants FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR
  public.is_admin() OR
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND c.created_by = auth.uid()
  )
);

-- ------------------------------------------------------------------------------
-- MESSAGES & ATTACHMENTS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Participants can read messages"
ON public.messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can send messages"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.conversation_participants cp
    WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Senders can edit or delete own messages"
ON public.messages FOR UPDATE
TO authenticated
USING (sender_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can delete own messages"
ON public.messages FOR DELETE
TO authenticated
USING (sender_id = auth.uid() OR public.is_admin());

CREATE POLICY "Conversation participants can view attachments"
ON public.attachments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = attachments.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert attachments for their messages"
ON public.attachments FOR INSERT
TO authenticated
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = attachments.message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Uploaders can delete their attachments"
ON public.attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());

CREATE POLICY "Participants can view reactions"
ON public.message_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can manage own reactions"
ON public.message_reactions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- LOVE NOTES & RELATIONSHIP MILESTONES POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Couples can view their love notes"
ON public.love_notes FOR SELECT
TO authenticated
USING (auth.uid() = author_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create love notes for their partner"
ON public.love_notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update love notes"
ON public.love_notes FOR UPDATE
TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can delete love notes"
ON public.love_notes FOR DELETE
TO authenticated
USING (auth.uid() = author_id);

CREATE POLICY "Couples can view milestones"
ON public.relationship_milestones FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can manage milestones"
ON public.relationship_milestones FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- MEMORIES & CALENDAR POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Users can view visible memories"
ON public.memories FOR SELECT
TO authenticated
USING (
  uploaded_by = auth.uid() OR
  visibility = 'circle' OR
  (visibility = 'partner' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.partner_id = memories.uploaded_by
  ))
);

CREATE POLICY "Users can upload memories"
ON public.memories FOR INSERT
TO authenticated
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Uploaders can update or delete memories"
ON public.memories FOR ALL
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view visible calendar events"
ON public.calendar_events FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid() OR
  visibility = 'circle' OR
  (visibility = 'partner' AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.partner_id = calendar_events.owner_id
  ))
);

CREATE POLICY "Users can manage own calendar events"
ON public.calendar_events FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- ------------------------------------------------------------------------------
-- CALL LOGS & DEVICE SESSIONS POLICIES
-- ------------------------------------------------------------------------------
CREATE POLICY "Call participants can view call logs"
ON public.call_logs FOR SELECT
TO authenticated
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Call participants can insert call logs"
ON public.call_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can manage own device sessions"
ON public.user_device_sessions FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own location audit logs"
ON public.location_audit_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 12. REALTIME PUBLICATION SETUP
-- ==============================================================================
-- Allow frontend clients to subscribe to live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
