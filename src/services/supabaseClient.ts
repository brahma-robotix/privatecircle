import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables exposed by Vite
const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const rawKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

function sanitizeUrl(url?: string): string {
  if (!url) return '';
  return url.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

const cleanedUrl = sanitizeUrl(rawUrl);

/**
 * Validate that the configuration values are present, non-empty,
 * and not unedited placeholder tokens.
 */
function isValidConfig(url?: string, key?: string): boolean {
  if (!url || !key) return false;
  if (url.includes('your-project-id') || key.includes('your-supabase-anon')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = (): boolean => {
  return isValidConfig(cleanedUrl, rawKey);
};

// Initialize the client safely if valid config is detected.
// In mock/development mode without Supabase credentials, this gracefully remains null.
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(cleanedUrl, rawKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseClient = (): SupabaseClient | null => supabase;

if (!isSupabaseConfigured()) {
  // Silent or non-blocking notification for developers
  if (import.meta.env.DEV) {
    console.info('[PrivateCircle] Supabase credentials not set or placeholder detected. Operating in local Mock Data mode.');
  }
} else {
  if (import.meta.env.DEV) {
    console.info('[PrivateCircle] Supabase client initialized successfully.');
  }
}
