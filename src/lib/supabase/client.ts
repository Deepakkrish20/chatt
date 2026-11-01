import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
 * Supabase client configured for Expo and React Native.
 * Uses AsyncStorage for mobile session persistence and token caching.
 * On Web, uses window.localStorage automatically.
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-chatt.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
    },
  }
);
