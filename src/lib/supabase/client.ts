/**
 * Supabase Client Skeleton / Future Integration Placeholder.
 *
 * NOTE: Authentication and database integration are NOT implemented in Module 1.
 * This client provides the environment validation and configuration interface
 * to be wired up with @supabase/supabase-js in Module 3.
 *
 * Requirements:
 * - Credentials must always be injected via environment variables (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY).
 * - No real keys, passwords, or active network connections exist in source control.
 */

export interface SupabaseConfig {
  url: string | null;
  anonKey: string | null;
  isConfigured: boolean;
}

export function getSupabaseConfig(): SupabaseConfig {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? null;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? null;

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

/**
 * Placeholder client instance for Module 1.
 * Real Supabase client initialization will be introduced in Module 3.
 */
export const supabaseClientPlaceholder = {
  isReady: false,
  description: 'Supabase client placeholder for Chatt Module 1',
};
