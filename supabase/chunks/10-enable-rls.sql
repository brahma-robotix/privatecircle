DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'profiles', 'invitations', 'conversations',
    'conversation_participants', 'messages', 'message_attachments',
    'message_reactions', 'love_notes', 'relationship_milestones',
    'memories', 'memory_comments', 'memory_reactions',
    'calendar_events', 'call_logs', 'user_device_sessions',
    'location_audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    END IF;
  END LOOP;
END $$;
