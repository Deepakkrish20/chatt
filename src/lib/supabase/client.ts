import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SUPABASE_URL = 'https://wxgatugyxopsznhlaodi.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4Z2F0dWd5eG9wc3puaGxhb2RpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNjI5NzgsImV4cCI6MjEwODkzODk3OH0.8-d1p0lK5f203ZDifZG9sU1WEZ88Xmq_itw3nA-Z9C4';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-key')
);

/**
 * SSR-safe storage adapter for Supabase.
 * In Node.js / SSR server rendering (where window is undefined), returns null safely.
 * On browser and native mobile runtimes, delegates to AsyncStorage.
 */
const SafeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (typeof window === 'undefined') {
      return null;
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (typeof window === 'undefined') {
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

/**
 * Supabase client configured for Expo and React Native.
 * Uses SafeAsyncStorage for mobile and web session persistence and token caching.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-chatt.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: SafeAsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
