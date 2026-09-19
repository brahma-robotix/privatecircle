CREATE POLICY "Couples can view love notes" ON public.love_notes FOR SELECT TO authenticated USING (auth.uid() = author_id OR auth.uid() = partner_id);
CREATE POLICY "Users can create love notes" ON public.love_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can update love notes" ON public.love_notes FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Authors can delete love notes" ON public.love_notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE POLICY "Couples can view milestones" ON public.relationship_milestones FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = partner_id);
CREATE POLICY "Users can manage milestones" ON public.relationship_milestones FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view memories" ON public.memories FOR SELECT TO authenticated USING (uploaded_by = auth.uid() OR visibility = 'circle' OR (visibility = 'partner' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_id = memories.uploaded_by)));
CREATE POLICY "Users can upload memories" ON public.memories FOR INSERT TO authenticated WITH CHECK (uploaded_by = auth.uid());
CREATE POLICY "Uploaders can manage memories" ON public.memories FOR ALL TO authenticated USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can view calendar events" ON public.calendar_events FOR SELECT TO authenticated USING (owner_id = auth.uid() OR visibility = 'circle' OR (visibility = 'partner' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.partner_id = calendar_events.owner_id)));
CREATE POLICY "Users can manage calendar events" ON public.calendar_events FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Call participants can view call logs" ON public.call_logs FOR SELECT TO authenticated USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Call participants can insert call logs" ON public.call_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Users can manage sessions" ON public.user_device_sessions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can view location audits" ON public.location_audit_logs FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin());

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_notes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
