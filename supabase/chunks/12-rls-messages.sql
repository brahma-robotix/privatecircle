CREATE POLICY "Participants can read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Participants can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Senders can edit or delete own messages" ON public.messages FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Senders can delete own messages" ON public.messages FOR DELETE TO authenticated USING (sender_id = auth.uid() OR public.is_admin());

CREATE POLICY "Participants can read message attachments" ON public.message_attachments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Message senders can insert attachments" ON public.message_attachments FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.messages m WHERE m.id = message_id AND m.sender_id = auth.uid())
);
CREATE POLICY "Participants can view reactions" ON public.message_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.messages m JOIN public.conversation_participants cp ON cp.conversation_id = m.conversation_id WHERE m.id = message_id AND cp.user_id = auth.uid())
);
CREATE POLICY "Users can manage own reactions" ON public.message_reactions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
