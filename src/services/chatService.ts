import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { Conversation, Message, Attachment, MessageReplyPreview } from '../types';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface ChatServiceCallbacks {
  onMessageInsert?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
  onMessageDelete?: (messageId: string) => void;
  onReactionChange?: () => void;
}

export const ChatService = {
  /**
   * Fetch conversations the user is a participant in.
   * If none exist in the database yet, automatically bootstraps the circle conversations.
   */
  async fetchConversations(userId: string): Promise<{ conversations: Conversation[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { conversations: [], error: 'Supabase client is not configured' };
    }

    try {
      // 1. Fetch conversations for this user
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partError) {
        return { conversations: [], error: partError.message };
      }

      let convIds = (participations || []).map((p) => p.conversation_id);

      // If user has no conversations yet, bootstrap default group & direct conversations
      if (convIds.length === 0) {
        await this.bootstrapDefaultConversations(userId);

        const { data: retryParts } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', userId);

        convIds = (retryParts || []).map((p) => p.conversation_id);
      }

      if (convIds.length === 0) {
        return { conversations: [], error: null };
      }

      // 2. Fetch conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', convIds)
        .order('updated_at', { ascending: false });

      if (convError) {
        return { conversations: [], error: convError.message };
      }

      // 3. Fetch all participants for these conversations
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('id', convIds);

      const participantMap: Record<string, string[]> = {};
      (allParticipants || []).forEach((p) => {
        if (!participantMap[p.conversation_id]) {
          participantMap[p.conversation_id] = [];
        }
        participantMap[p.conversation_id].push(p.user_id);
      });

      const conversations: Conversation[] = (convData || []).map((c) => ({
        id: c.id,
        type: c.type,
        name: c.name,
        description: c.description || '',
        participantIds: participantMap[c.id] || [userId],
        lastMessage: c.last_message || '',
        lastMessageTimestamp: c.last_message_timestamp
          ? new Date(c.last_message_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : undefined,
        avatarBg: c.type === 'group' ? '#4f46e5' : '#e11d48',
      }));

      return { conversations, error: null };
    } catch (err: any) {
      return { conversations: [], error: err.message || 'Failed to fetch conversations' };
    }
  },

  /**
   * Bootstraps the default "Our Inner Circle" group conversation for the circle
   */
  async bootstrapDefaultConversations(userId: string): Promise<void> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) return;

    try {
      // Check if "Our Inner Circle" already exists
      const { data: existingGroup } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .eq('name', 'Our Inner Circle')
        .limit(1)
        .maybeSingle();

      let groupConvId = existingGroup?.id;

      if (!groupConvId) {
        // Create circle group
        const { data: newGroup } = await supabase
          .from('conversations')
          .insert({
            type: 'group',
            name: 'Our Inner Circle',
            description: 'Private trusted circle chat for updates, photos, and group moments',
            created_by: userId,
            last_message: 'Welcome to PrivateCircle! Messages here are private and encrypted in transit.',
            last_message_timestamp: new Date().toISOString(),
          })
          .select('id')
          .single();

        groupConvId = newGroup?.id;
      }

      if (groupConvId) {
        // Add user as participant
        await supabase
          .from('conversation_participants')
          .upsert({
            conversation_id: groupConvId,
            user_id: userId,
            role: 'member',
          }, { onConflict: 'conversation_id,user_id' });
      }

      // Also fetch other profiles to establish direct conversation with circle partner if available
      const { data: otherProfiles } = await supabase
        .from('profiles')
        .select('id, name')
        .neq('id', userId)
        .limit(5);

      if (otherProfiles && otherProfiles.length > 0) {
        for (const other of otherProfiles) {
          const { data: sharedParts } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', userId);

          const userConvIds = (sharedParts || []).map((p) => p.conversation_id);
          let directExists = false;

          if (userConvIds.length > 0) {
            const { data: partnerInSame } = await supabase
              .from('conversation_participants')
              .select('conversation_id')
              .eq('user_id', other.id)
              .in('conversation_id', userConvIds);

            if (partnerInSame && partnerInSame.length > 0) {
              const { data: directCheck } = await supabase
                .from('conversations')
                .select('id')
                .in('id', partnerInSame.map(p => p.conversation_id))
                .eq('type', 'direct')
                .limit(1);

              if (directCheck && directCheck.length > 0) {
                directExists = true;
              }
            }
          }

          if (!directExists) {
            const { data: directConv } = await supabase
              .from('conversations')
              .insert({
                type: 'direct',
                name: other.name || 'Partner',
                created_by: userId,
                last_message: 'Connected in PrivateCircle.',
                last_message_timestamp: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (directConv?.id) {
              await supabase.from('conversation_participants').insert([
                { conversation_id: directConv.id, user_id: userId, role: 'member' },
                { conversation_id: directConv.id, user_id: other.id, role: 'member' },
              ]);
            }
          }
        }
      }
    } catch (e) {
      console.warn('[ChatService] Bootstrap error:', e);
    }
  },

  /**
   * Fetch all messages in a conversation, including attachments and reactions
   */
  async fetchMessages(conversationId: string): Promise<{ messages: Message[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { messages: [], error: 'Supabase client is not configured' };
    }

    try {
      // 1. Fetch raw messages
      const { data: msgRows, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        return { messages: [], error: msgError.message };
      }

      if (!msgRows || msgRows.length === 0) {
        return { messages: [], error: null };
      }

      const msgIds = msgRows.map((m) => m.id);

      // 2. Fetch attachments for these messages
      const { data: attRows } = await supabase
        .from('attachments')
        .select('*')
        .in('message_id', msgIds);

      // 3. Fetch reactions for these messages
      const { data: reactRows } = await supabase
        .from('message_reactions')
        .select('*')
        .in('message_id', msgIds);

      // Group attachments by message_id
      const attachmentMap: Record<string, Attachment[]> = {};
      (attRows || []).forEach((row) => {
        if (!attachmentMap[row.message_id]) {
          attachmentMap[row.message_id] = [];
        }
        attachmentMap[row.message_id].push({
          id: row.id,
          type: row.file_type as 'image' | 'video' | 'audio',
          url: row.file_path,
          name: row.original_filename || 'Attachment',
          sizeBytes: row.file_size_bytes ? Number(row.file_size_bytes) : undefined,
          durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
          waveform: row.waveform || undefined,
        });
      });

      // Group reactions by message_id -> emoji -> [userIds]
      const reactionMap: Record<string, Record<string, string[]>> = {};
      (reactRows || []).forEach((row) => {
        if (!reactionMap[row.message_id]) {
          reactionMap[row.message_id] = {};
        }
        if (!reactionMap[row.message_id][row.emoji]) {
          reactionMap[row.message_id][row.emoji] = [];
        }
        reactionMap[row.message_id][row.emoji].push(row.user_id);
      });

      // Transform rows into frontend Message models
      const messages: Message[] = msgRows.map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        text: row.text || '',
        timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isEdited: row.is_edited || false,
        translatedText: row.translated_text || undefined,
        originalText: row.original_text || undefined,
        replyTo: row.reply_to_preview as MessageReplyPreview | undefined,
        attachments: attachmentMap[row.id] || undefined,
        reactions: reactionMap[row.id] || undefined,
      }));

      return { messages, error: null };
    } catch (err: any) {
      return { messages: [], error: err.message || 'Failed to fetch messages' };
    }
  },

  /**
   * Send a real message to a Supabase conversation with optional attachments & quoted reply
   */
  async sendRealMessage(
    conversationId: string,
    senderId: string,
    text: string,
    attachments?: (Attachment & { filePath?: string })[],
    replyTo?: MessageReplyPreview
  ): Promise<{ message: Message | null; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { message: null, error: 'Supabase client is not configured' };
    }

    try {
      // 1. Insert message
      const { data: newMsg, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          text: text.trim(),
          reply_to_preview: replyTo || null,
        })
        .select('*')
        .single();

      if (insertError) {
        return { message: null, error: insertError.message };
      }

      // 2. Insert attachments if provided
      let savedAttachments: Attachment[] = [];
      if (attachments && attachments.length > 0) {
        const attachmentInserts = attachments.map((att) => ({
          message_id: newMsg.id,
          uploaded_by: senderId,
          file_path: att.filePath || att.url,
          file_type: att.type,
          file_size_bytes: att.sizeBytes || 0,
          duration_seconds: att.durationSeconds || null,
          original_filename: att.name,
          waveform: att.waveform || null,
        }));

        const { data: attData } = await supabase
          .from('attachments')
          .insert(attachmentInserts)
          .select('*');

        if (attData) {
          savedAttachments = attData.map((row, idx) => ({
            id: row.id,
            type: row.file_type as 'image' | 'video' | 'audio',
            url: attachments[idx]?.url || row.file_path,
            name: row.original_filename || 'Attachment',
            sizeBytes: Number(row.file_size_bytes),
            durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
            waveform: row.waveform || undefined,
          }));
        }
      }

      // 3. Update conversation last_message preview
      const previewText =
        text.trim() ||
        (attachments && attachments.length > 0
          ? `[Attached ${attachments[0].type}]`
          : 'New message');

      await supabase
        .from('conversations')
        .update({
          last_message: previewText,
          last_message_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);

      const message: Message = {
        id: newMsg.id,
        conversationId: newMsg.conversation_id,
        senderId: newMsg.sender_id,
        text: newMsg.text,
        timestamp: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        replyTo: replyTo,
        attachments: savedAttachments.length > 0 ? savedAttachments : undefined,
        reactions: {},
      };

      return { message, error: null };
    } catch (err: any) {
      return { message: null, error: err.message || 'Failed to send message' };
    }
  },

  /**
   * Subscribe to live Realtime updates for a conversation
   */
  subscribeToConversation(
    conversationId: string,
    callbacks: ChatServiceCallbacks
  ): RealtimeChannel | null {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    try {
      const channel = supabase
        .channel(`chat-room-${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          async (payload) => {
            const raw = payload.new as any;
            if (!raw) return;

            const client = getSupabaseClient();
            let attachments: Attachment[] = [];

            if (client) {
              const { data: attRows } = await client
                .from('attachments')
                .select('*')
                .eq('message_id', raw.id);

              attachments = (attRows || []).map((row) => ({
                id: row.id,
                type: row.file_type as 'image' | 'video' | 'audio',
                url: row.file_path,
                name: row.original_filename || 'Attachment',
                sizeBytes: Number(row.file_size_bytes),
                durationSeconds: row.duration_seconds ? Number(row.duration_seconds) : undefined,
                waveform: row.waveform || undefined,
              }));
            }

            const message: Message = {
              id: raw.id,
              conversationId: raw.conversation_id,
              senderId: raw.sender_id,
              text: raw.text || '',
              timestamp: new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isEdited: raw.is_edited || false,
              replyTo: raw.reply_to_preview as MessageReplyPreview | undefined,
              attachments: attachments.length > 0 ? attachments : undefined,
              reactions: {},
            };

            callbacks.onMessageInsert?.(message);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const raw = payload.new as any;
            if (!raw) return;

            const message: Message = {
              id: raw.id,
              conversationId: raw.conversation_id,
              senderId: raw.sender_id,
              text: raw.text || '',
              timestamp: new Date(raw.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              isEdited: raw.is_edited || false,
              replyTo: raw.reply_to_preview as MessageReplyPreview | undefined,
            };

            callbacks.onMessageUpdate?.(message);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'messages',
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const oldRecord = payload.old as any;
            if (oldRecord?.id) {
              callbacks.onMessageDelete?.(oldRecord.id);
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'message_reactions',
          },
          () => {
            callbacks.onReactionChange?.();
          }
        )
        .subscribe();

      return channel;
    } catch (e) {
      console.warn('[ChatService] Realtime subscription error:', e);
      return null;
    }
  },

  /**
   * Add or toggle an emoji reaction
   */
  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { data: existing } = await supabase
        .from('message_reactions')
        .select('id')
        .eq('message_id', messageId)
        .eq('user_id', userId)
        .eq('emoji', emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('message_reactions')
          .delete()
          .eq('id', existing.id);

        return { success: !error, error: error?.message || null };
      } else {
        const { error } = await supabase
          .from('message_reactions')
          .insert({
            message_id: messageId,
            user_id: userId,
            emoji,
          });

        return { success: !error, error: error?.message || null };
      }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to toggle reaction' };
    }
  },

  /**
   * Edit an existing message
   */
  async editMessage(
    messageId: string,
    senderId: string,
    newText: string
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          text: newText.trim(),
          is_edited: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', messageId)
        .eq('sender_id', senderId);

      return { success: !error, error: error?.message || null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to edit message' };
    }
  },

  /**
   * Delete a message
   */
  async deleteMessage(messageId: string, senderId: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', senderId);

      return { success: !error, error: error?.message || null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete message' };
    }
  },
};
