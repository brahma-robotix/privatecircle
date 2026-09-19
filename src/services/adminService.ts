import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { User, Invitation, UserRole, UserStatus } from '../types';
import { mapProfileToUser } from './authService';

export interface CreateInvitationResult {
  invitation: Invitation | null;
  error: string | null;
}

export const AdminService = {
  /**
   * Fetch all registered circle profiles from public.profiles
   */
  async fetchCircleMembers(): Promise<{ users: User[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { users: [], error: 'Supabase client is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        return { users: [], error: error.message };
      }

      const users: User[] = (data || []).map((row) => mapProfileToUser(row));
      return { users, error: null };
    } catch (err: any) {
      return { users: [], error: err.message || 'Failed to fetch circle members' };
    }
  },

  /**
   * Fetch all invitations from public.invitations
   */
  async fetchInvitations(): Promise<{ invitations: Invitation[]; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { invitations: [], error: 'Supabase client is not configured' };
    }

    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        return { invitations: [], error: error.message };
      }

      const invitations: Invitation[] = (data || []).map((row) => ({
        id: row.id,
        email: row.email,
        invitedBy: row.invited_by || 'Admin',
        code: row.code,
        status: row.status,
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : new Date().toLocaleString(),
        expiresAt: row.expires_at ? new Date(row.expires_at).toLocaleString() : 'In 48 hours',
      }));

      return { invitations, error: null };
    } catch (err: any) {
      return { invitations: [], error: err.message || 'Failed to fetch invitations' };
    }
  },

  /**
   * Generate and insert a real invitation code into public.invitations
   */
  async createInvitation(
    email: string,
    invitedByUserId: string,
    expiresInHours = 48
  ): Promise<CreateInvitationResult> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { invitation: null, error: 'Supabase client is not configured' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { invitation: null, error: 'Email is required' };
    }

    // Generate readable, secure code: PRIV-XXXX-EML
    const randPart = Math.floor(1000 + Math.random() * 9000);
    const emailPrefix = cleanEmail.split('@')[0].slice(0, 3).toUpperCase() || 'USR';
    const code = `PRIV-${randPart}-${emailPrefix}`;

    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    try {
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: cleanEmail,
          invited_by: invitedByUserId,
          code,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('*')
        .single();

      if (error) {
        return { invitation: null, error: error.message };
      }

      const invitation: Invitation = {
        id: data.id,
        email: data.email,
        invitedBy: data.invited_by || 'Admin',
        code: data.code,
        status: data.status,
        createdAt: new Date(data.created_at).toLocaleString(),
        expiresAt: new Date(data.expires_at).toLocaleString(),
      };

      return { invitation, error: null };
    } catch (err: any) {
      return { invitation: null, error: err.message || 'Failed to create invitation' };
    }
  },

  /**
   * Approve or reject a pending invitation
   */
  async updateInvitationStatus(
    id: string,
    status: 'approved' | 'rejected'
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update invitation status' };
    }
  },

  /**
   * Delete / revoke an invitation
   */
  async deleteInvitation(id: string): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to delete invitation' };
    }
  },

  /**
   * Toggle a member's active vs suspended status in public.profiles
   */
  async toggleUserSuspension(
    userId: string,
    newStatus: UserStatus
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update member status' };
    }
  },

  /**
   * Update a member's role (admin vs member)
   */
  async updateUserRole(
    userId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error: string | null }> {
    const supabase = getSupabaseClient();
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase client is not configured' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to update member role' };
    }
  },
};
