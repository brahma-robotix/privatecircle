-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  size_bytes BIGINT,
  duration_seconds NUMERIC,
  waveform INTEGER[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP POLICY IF EXISTS "Participants can read message attachments" ON public.message_attachments;
CREATE POLICY "Participants can read message attachments" ON public.message_attachments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_attachments.message_id AND cp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Message senders can insert attachments" ON public.message_attachments;
CREATE POLICY "Message senders can insert attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_attachments.message_id AND m.sender_id = auth.uid())
);

DROP POLICY IF EXISTS "Participants can view reactions" ON public.message_reactions;
CREATE POLICY "Participants can view reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_reactions.message_id AND cp.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can manage own reactions" ON public.message_reactions;
CREATE POLICY "Users can manage own reactions" ON public.message_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
