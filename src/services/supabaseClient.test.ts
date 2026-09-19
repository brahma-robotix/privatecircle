import { describe, it, expect } from 'vitest';
import { isSupabaseConfigured, supabase, getSupabaseClient } from './supabaseClient';

describe('supabaseClient service', () => {
  it('exports configuration status without throwing', () => {
    const configured = isSupabaseConfigured();
    expect(typeof configured).toBe('boolean');
  });

  it('exports supabase client or null consistently', () => {
    const client = getSupabaseClient();
    if (isSupabaseConfigured()) {
      expect(client).not.toBeNull();
      expect(supabase).not.toBeNull();
      expect(typeof client?.from).toBe('function');
    } else {
      expect(client).toBeNull();
      expect(supabase).toBeNull();
    }
  });
});
