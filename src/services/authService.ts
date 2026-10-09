import { supabase, isSupabaseConfigured } from './supabaseClient';
import { User, UserRole } from '../types';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export type AuthOAuthProvider = 'google' | 'facebook';

export interface VerifyInvitationResult {
  valid: boolean;
  invitation?: Record<string, any>;
  error: string | null;
}

/**
 * Maps a Supabase `public.profiles` database record to the app's `User` model.
 */
export function mapProfileToUser(profile: Record<string, any>): User {
  return {
    id: profile.id,
    email: profile.email || '',
    name: profile.name || profile.email?.split('@')[0] || 'Circle Member',
    role: profile.role || 'member',
    status: profile.status || 'active',
    avatarBg: profile.avatar_bg || '#6366f1',
    bio: profile.bio || '',
    partnerId: profile.partner_id || undefined,
    relationshipStartDate: profile.relationship_start_date || undefined,
    locationSettings: profile.location_settings || {
      enabled: false,
      audience: 'off',
      duration: 'always',
    },
    privacySettings: profile.privacy_settings || {
      whoCanContact: 'circle',
      profileVisibility: 'circle',
      onlineStatusVisibility: 'circle',
      lastSeenVisibility: 'circle',
      exactLocationEnabled: false,
      approximateLocationEnabled: true,
      allowedLocationUserIds: [],
      externalTranslationConsent: false,
      automaticTranslationEnabled: false,
      discreetNotificationPreviews: true,
    },
  };
}

/**
 * Translates raw Supabase authentication errors into friendly, actionable messages.
 */
export function formatAuthError(error: any): string {
  if (!error) return 'An unexpected error occurred.';
  const msg = typeof error === 'string' ? error : error.message || '';

  if (msg.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password. Please check your details and try again.';
  }
  if (msg.toLowerCase().includes('email not confirmed')) {
    return 'Your email has not been confirmed yet. Please check your inbox for the confirmation link.';
  }
  if (msg.toLowerCase().includes('user already registered') || msg.toLowerCase().includes('already exists')) {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (msg.toLowerCase().includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many requests')) {
    return 'Too many login attempts. Please wait a moment before trying again.';
  }
  if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network')) {
    return 'Unable to reach the authentication server. Please check your internet connection.';
  }

  return msg || 'Authentication failed. Please try again.';
}

export const AuthService = {
  /**
   * Verify a single-use, email-bound invitation without exposing the invitation row.
   * The database trigger atomically consumes the code during account creation.
   */
  async verifyInvitationCode(code: string, email?: string): Promise<VerifyInvitationResult> {
    if (!isSupabaseConfigured() || !supabase) {
      return { valid: true, error: null };
    }

    const cleanCode = code?.trim().toUpperCase();
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanCode || !cleanEmail) {
      return { valid: false, error: 'Enter the invitation code and the email address it was issued to.' };
    }

    try {
      const { data, error } = await supabase.rpc('verify_invitation_code', {
        p_code: cleanCode,
        p_email: cleanEmail,
      });
      if (error) return { valid: false, error: formatAuthError(error) };
      if (data !== true) {
        return { valid: false, error: 'Invalid, expired, already used, or email-mismatched invitation code.' };
      }
      return { valid: true, error: null };
    } catch (err: any) {
      return { valid: false, error: formatAuthError(err) };
    }
  },

  /**
   * Register a new user with email, password, name, and mandatory invite code verification.
   * Passwords are submitted directly to Supabase Auth and never stored in app state or DB.
   */
  async signUp(
    email: string,
    password: string,
    name: string,
    inviteCode?: string
  ): Promise<{ user: User | null; session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { user: null, session: null, error: 'Supabase is not configured. Please use Mock Mode.' };
    }

    // Enforce invite-only verification before creating auth user
    const inviteCheck = await this.verifyInvitationCode(inviteCode || '', email);
    if (!inviteCheck.valid) {
      return { user: null, session: null, error: inviteCheck.error };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim() || 'Circle Member',
            invite_code: inviteCode?.trim().toUpperCase() || '',
          },
        },
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      if (data.user) {
        // The database auth trigger consumes the invitation atomically.

        // Fetch or create profile
        const profile = await this.fetchProfile(data.user.id);
        const mappedUser = profile
          ? mapProfileToUser(profile)
          : {
              id: data.user.id,
              email: data.user.email || email,
              name: name.trim() || 'Circle Member',
              role: 'member' as UserRole,
              status: 'active' as const,
              avatarBg: '#6366f1',
            };

        return { user: mappedUser, session: data.session, error: null };
      }

      return { user: null, session: null, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: formatAuthError(err) };
    }
  },

  /**
   * Sign in using email and password.
   */
  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { user: null, session: null, error: 'Supabase is not configured. Please use Mock Mode.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: formatAuthError(error) };
      }

      if (!data.user) {
        return { user: null, session: null, error: 'User could not be found.' };
      }

      const profile = await this.fetchProfile(data.user.id);
      if (profile && profile.status === 'suspended') {
        // Sign out immediately if account was suspended by admin
        await supabase.auth.signOut();
        return { user: null, session: null, error: 'This account is currently suspended by circle administrators.' };
      }

      const mappedUser = profile
        ? mapProfileToUser(profile)
        : {
            id: data.user.id,
            email: data.user.email || email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Circle Member',
            role: 'member' as const,
            status: 'active' as const,
            avatarBg: '#6366f1',
          };

      return { user: mappedUser, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: formatAuthError(err) };
    }
  },

  /**
   * Modular OAuth sign-in abstraction (Google & Facebook ready).
   * Allows Google or Facebook providers to be activated in the future
   * without altering the application's core login architecture.
   */
  async signInWithOAuth(
    provider: AuthOAuthProvider,
    redirectTo?: string
  ): Promise<{ url?: string; error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { error: 'Supabase is not configured.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectTo || window.location.origin,
        },
      });

      if (error) {
        return { error: formatAuthError(error) };
      }

      return { url: data.url || undefined, error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  },

  /**
   * Sign out the active user and revoke session tokens.
   */
  async signOut(): Promise<{ error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { error: null };
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { error: formatAuthError(error) };
      }
      return { error: null };
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  },

  /**
   * Send a password reset email via Supabase Auth.
   */
  async resetPassword(email: string): Promise<{ success: boolean; error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Supabase is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: formatAuthError(error) };
      }

      return { success: true, error: null };
    } catch (err: any) {
      return { success: false, error: formatAuthError(err) };
    }
  },

  /**
   * Retrieve active session on boot.
   */
  async getSession(): Promise<{ session: Session | null; error: string | null }> {
    if (!isSupabaseConfigured() || !supabase) {
      return { session: null, error: null };
    }

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        return { session: null, error: formatAuthError(error) };
      }
      return { session: data.session, error: null };
    } catch (err: any) {
      return { session: null, error: formatAuthError(err) };
    }
  },

  /**
   * Fetch profile record from public.profiles for a given user UUID.
   */
  async fetchProfile(userId: string): Promise<Record<string, any> | null> {
    if (!isSupabaseConfigured() || !supabase) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('[AuthService] Profile fetch notice:', error.message);
        return null;
      }

      return data;
    } catch (err) {
      console.warn('[AuthService] Profile fetch exception:', err);
      return null;
    }
  },

  /**
   * Listen for real-time auth state transitions across tabs/windows.
   */
  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    if (!isSupabaseConfigured() || !supabase) {
      return { unsubscribe: () => {} };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },
};
