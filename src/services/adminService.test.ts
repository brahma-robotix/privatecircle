import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './adminService';
import * as supabaseClientModule from './supabaseClient';

describe('AdminService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('handles unconfigured Supabase client gracefully', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(false);

    const membersRes = await AdminService.fetchCircleMembers();
    expect(membersRes.error).toBe('Supabase client is not configured');
    expect(membersRes.users).toEqual([]);

    const invitesRes = await AdminService.fetchInvitations();
    expect(invitesRes.error).toBe('Supabase client is not configured');
    expect(invitesRes.invitations).toEqual([]);

    const createRes = await AdminService.createInvitation('test@example.com', 'admin-123');
    expect(createRes.error).toBe('Supabase client is not configured');
    expect(createRes.invitation).toBeNull();
  });

  it('rejects empty email on invitation creation', async () => {
    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue({} as any);

    const createRes = await AdminService.createInvitation('   ', 'admin-123');
    expect(createRes.error).toBe('Email is required');
    expect(createRes.invitation).toBeNull();
  });

  it('formats invitation code with PRIV- prefix and uppercase characters', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'inv-real-1',
            email: 'partner@example.com',
            invited_by: 'admin-123',
            code: 'PRIV-1234-PAR',
            status: 'pending',
            created_at: '2026-09-13T10:00:00Z',
            expires_at: '2026-09-15T10:00:00Z',
          },
          error: null,
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        insert: mockInsert,
      }),
    } as any;

    vi.spyOn(supabaseClientModule, 'isSupabaseConfigured').mockReturnValue(true);
    vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockSupabase);

    const res = await AdminService.createInvitation('partner@example.com', 'admin-123');
    expect(res.error).toBeNull();
    expect(res.invitation).toBeDefined();
    expect(res.invitation?.email).toBe('partner@example.com');
    expect(res.invitation?.code).toContain('PRIV-');
  });
});
