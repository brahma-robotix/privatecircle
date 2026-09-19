import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from './chatService';
import * as supabaseClientModule from './supabaseClient';

describe('ChatService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles unconfigured Supabase gracefully for fetchConversations and fetchMessages', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

    const convRes = await ChatService.fetchConversations('user-123');
    expect(convRes.error).toBe('Supabase client is not configured');
    expect(convRes.conversations).toEqual([]);

    const msgRes = await ChatService.fetchMessages('conv-123');
    expect(msgRes.error).toBe('Supabase client is not configured');
    expect(msgRes.messages).toEqual([]);

    const sendRes = await ChatService.sendRealMessage('conv-123', 'user-123', 'Hello');
    expect(sendRes.error).toBe('Supabase client is not configured');
    expect(sendRes.message).toBeNull();
  });

  it('sends real message and updates conversation timestamp', async () => {
    const mockInsertMsg = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'msg-supabase-1',
            conversation_id: 'conv-1',
            sender_id: 'user-1',
            text: 'Hello from Supabase!',
            created_at: '2026-09-13T10:00:00Z',
          },
          error: null,
        }),
      }),
    });

    const mockUpdateConv = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'messages') {
          return { insert: mockInsertMsg };
        }
        if (table === 'conversations') {
          return { update: mockUpdateConv };
        }
        return {};
      }),
    } as any;

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase);

    const res = await ChatService.sendRealMessage('conv-1', 'user-1', 'Hello from Supabase!');

    expect(res.error).toBeNull();
    expect(res.message).toBeDefined();
    expect(res.message?.id).toBe('msg-supabase-1');
    expect(res.message?.text).toBe('Hello from Supabase!');
    expect(mockInsertMsg).toHaveBeenCalled();
    expect(mockUpdateConv).toHaveBeenCalled();
  });
});
