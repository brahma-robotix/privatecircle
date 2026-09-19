-- Create the attachments table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attachments_msg ON public.attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON public.attachments(uploaded_by);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Conversation participants can view attachments" ON public.attachments;
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

DROP POLICY IF EXISTS "Users can insert attachments for their messages" ON public.attachments;
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

DROP POLICY IF EXISTS "Uploaders can delete their attachments" ON public.attachments;
CREATE POLICY "Uploaders can delete their attachments"
ON public.attachments FOR DELETE
TO authenticated
USING (uploaded_by = auth.uid());
