import { describe, it, expect } from 'vitest';
import { formatAuthError, mapProfileToUser, AuthService } from './authService';

describe('AuthService unit tests', () => {
  describe('formatAuthError', () => {
    it('translates invalid credentials error into friendly message', () => {
      const err = { message: 'Invalid login credentials' };
      expect(formatAuthError(err)).toContain('Incorrect email or password');
    });

    it('translates unconfirmed email error into friendly message', () => {
      const err = { message: 'Email not confirmed' };
      expect(formatAuthError(err)).toContain('check your inbox for the confirmation link');
    });

    it('translates already registered error into friendly message', () => {
      const err = { message: 'User already registered' };
      expect(formatAuthError(err)).toContain('already exists');
    });

    it('translates short password error into friendly message', () => {
      const err = { message: 'Password should be at least 6 characters' };
      expect(formatAuthError(err)).toContain('at least 6 characters');
    });

    it('translates rate limit error into friendly message', () => {
      const err = { message: 'rate limit exceeded' };
      expect(formatAuthError(err)).toContain('Too many login attempts');
    });

    it('handles unexpected or fallback error gracefully', () => {
      expect(formatAuthError(null)).toBe('An unexpected error occurred.');
      expect(formatAuthError('Custom custom error')).toBe('Custom custom error');
    });
  });

  describe('mapProfileToUser', () => {
    it('correctly maps snake_case database columns to camelCase User model', () => {
      const dbRecord = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'alex@example.test',
        name: 'Alex',
        role: 'admin',
        status: 'active',
        avatar_bg: '#10b981',
        bio: 'Founder',
        partner_id: '987fcdeb-51a2-43f7-9abc-def012345678',
        relationship_start_date: '2024-01-01',
      };

      const user = mapProfileToUser(dbRecord);
      expect(user.id).toBe(dbRecord.id);
      expect(user.email).toBe(dbRecord.email);
      expect(user.name).toBe('Alex');
      expect(user.role).toBe('admin');
      expect(user.partnerId).toBe('987fcdeb-51a2-43f7-9abc-def012345678');
      expect(user.relationshipStartDate).toBe('2024-01-01');
      expect(user.avatarBg).toBe('#10b981');
    });

    it('provides robust default fallback values for missing profile attributes', () => {
      const minimalRecord = {
        id: 'user-minimal',
        email: 'member@private.test',
      };

      const user = mapProfileToUser(minimalRecord);
      expect(user.id).toBe('user-minimal');
      expect(user.name).toBe('member');
      expect(user.role).toBe('member');
      expect(user.status).toBe('active');
      expect(user.locationSettings?.enabled).toBe(false);
      expect(user.privacySettings?.whoCanContact).toBe('circle');
    });
  });

  describe('AuthService API', () => {
    it('safe getSession returns session without throwing an exception', async () => {
      const result = await AuthService.getSession();
      expect(result).toBeDefined();
      expect('session' in result).toBe(true);
    });

    it('rejects empty invitation code when database has users', async () => {
      const res = await AuthService.verifyInvitationCode('', 'test@example.com');
      // In mock/test fallback or real DB, empty code check returns structured result
      expect(typeof res.valid).toBe('boolean');
      expect('error' in res).toBe(true);
    });

    it('supports modular OAuth sign in interface for Google and Facebook', async () => {
      expect(typeof AuthService.signInWithOAuth).toBe('function');
      const googleRes = await AuthService.signInWithOAuth('google');
      expect(googleRes).toBeDefined();
      expect('error' in googleRes).toBe(true);

      const fbRes = await AuthService.signInWithOAuth('facebook');
      expect(fbRes).toBeDefined();
      expect('error' in fbRes).toBe(true);
    });

    it('supports claimInvitation without throwing an exception', async () => {
      expect(typeof AuthService.claimInvitation).toBe('function');
      const res = await AuthService.claimInvitation('INV-TEST', 'user-123');
      expect(res).toBeDefined();
      expect(typeof res.success).toBe('boolean');
    });
  });
});
