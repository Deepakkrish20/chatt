import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DatabaseProfile, MemberCapacityResult } from '@/lib/supabase/types';
import { MAX_REGISTERED_MEMBERS } from '@/types';
import { IN_BUILT_USER, PROVISIONED_ACCOUNTS } from '@/data/mockData';

// 3 Days inactivity timeout in milliseconds (72 hours)
export const INACTIVITY_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000;
const LAST_ACTIVE_KEY = '@chatt_last_active_timestamp';
const SAVED_SESSION_KEY = '@chatt_saved_session_data';

export interface MemberCapacity {
  activeMembers: number;
  maxMembers: number;
  slotsRemaining: number;
  isFull: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: DatabaseProfile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  wasSessionExpired: boolean;
  clearSessionExpiredFlag: () => void;
  capacity: MemberCapacity;
  refreshCapacity: () => Promise<void>;
  recordActivity: () => Promise<void>;
  signIn: (identifier: string, password: string) => Promise<{ error: string | null }>;
  requestEmailOtp: (email: string) => Promise<{ error: string | null }>;
  verifyEmailOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  setPasswordAndProfile: (
    password: string,
    displayName: string,
    username: string
  ) => Promise<{ error: string | null }>;
  adminCreateMember: (
    username: string,
    displayName: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [wasSessionExpired, setWasSessionExpired] = useState(false);
  const [capacity, setCapacity] = useState<MemberCapacity>({
    activeMembers: PROVISIONED_ACCOUNTS.length,
    maxMembers: MAX_REGISTERED_MEMBERS,
    slotsRemaining: MAX_REGISTERED_MEMBERS - PROVISIONED_ACCOUNTS.length,
    isFull: false,
  });

  const isAdmin = Boolean(
    profile?.username?.toLowerCase() === 'deepak' ||
    user?.email?.toLowerCase() === IN_BUILT_USER.email.toLowerCase()
  );

  // Track user activity timestamp
  const recordActivity = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    } catch {
      // Storage error ignored
    }
  }, []);

  const clearSessionExpiredFlag = useCallback(() => {
    setWasSessionExpired(false);
  }, []);

  // Fetch Member Capacity from Server
  const refreshCapacity = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setCapacity({
        activeMembers: PROVISIONED_ACCOUNTS.length,
        maxMembers: MAX_REGISTERED_MEMBERS,
        slotsRemaining: Math.max(0, MAX_REGISTERED_MEMBERS - PROVISIONED_ACCOUNTS.length),
        isFull: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_member_capacity');
      if (error) {
        // Fallback to direct count
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!countError && count !== null) {
          const active = Math.max(1, count);
          setCapacity({
            activeMembers: active,
            maxMembers: MAX_REGISTERED_MEMBERS,
            slotsRemaining: Math.max(0, MAX_REGISTERED_MEMBERS - active),
            isFull: active >= MAX_REGISTERED_MEMBERS,
          });
        }
      } else if (data) {
        const res = data as MemberCapacityResult;
        setCapacity({
          activeMembers: res.active_members,
          maxMembers: res.max_members,
          slotsRemaining: res.slots_remaining,
          isFull: res.is_full,
        });
      }
    } catch {
      // Safe fallback
    }
  }, []);

  // Fetch User Profile
  const fetchProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        setProfile(data as DatabaseProfile);
      }
    } catch {
      // Ignore
    }
  }, []);

  // Sign Out helper
  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
      await AsyncStorage.removeItem(SAVED_SESSION_KEY);
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // Ignore
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  // Check 3-day inactivity threshold
  const checkInactivity = useCallback(async (): Promise<boolean> => {
    try {
      const lastActiveStr = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (!lastActiveStr) {
        return false;
      }
      const lastActiveTime = parseInt(lastActiveStr, 10);
      const now = Date.now();
      const inactiveDuration = now - lastActiveTime;

      if (lastActiveTime > 0 && inactiveDuration > INACTIVITY_TIMEOUT_MS) {
        // More than 3 days of inactivity: expire session
        await signOut();
        setWasSessionExpired(true);
        return true;
      }

      // Still valid within 3 days: refresh timestamp
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, now.toString());
      return false;
    } catch {
      return false;
    }
  }, [signOut]);

  // AppState listener for 3-day inactivity check when returning to foreground
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        await checkInactivity();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
    };
  }, [checkInactivity]);

  // Initialize Auth & Session Restoration
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      const expired = await checkInactivity();
      if (expired) {
        if (isMounted) setIsLoading(false);
        return;
      }

      if (!isSupabaseConfigured) {
        const localSaved = await AsyncStorage.getItem(SAVED_SESSION_KEY);
        if (localSaved && isMounted) {
          try {
            const parsed = JSON.parse(localSaved);
            setUser(parsed.user);
            setProfile(parsed.profile);
            await recordActivity();
          } catch {
            // Ignore
          }
        }
        if (isMounted) setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (!error && initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
          await recordActivity();
        }
      } catch {
        // Session restoration failure handled safely
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }

      await refreshCapacity();
    }

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
          await recordActivity();
        } else {
          setProfile(null);
        }

        await refreshCapacity();
      }
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [fetchProfile, refreshCapacity, checkInactivity, recordActivity]);

  // 1. Sign In with Username or Email & Password
  const signIn = async (
    identifier: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const raw = identifier.trim().toLowerCase();
    const cleanEmail = raw.includes('@') ? raw : `${raw}@chatt.internal`;

    // Local / Offline fallback checking PROVISIONED_ACCOUNTS
    if (!isSupabaseConfigured) {
      const match = PROVISIONED_ACCOUNTS.find(
        (acc) =>
          (acc.email.toLowerCase() === cleanEmail || acc.username.toLowerCase() === raw) &&
          acc.password === password
      );

      if (match) {
        const localUser = {
          id: `user_${match.username}`,
          email: match.email,
          app_metadata: {},
          user_metadata: { displayName: match.displayName, username: match.username },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as User;

        const localProfile: DatabaseProfile = {
          id: `user_${match.username}`,
          username: match.username,
          display_name: match.displayName,
          avatar_url: null,
          status: 'online',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setUser(localUser);
        setProfile(localProfile);
        await AsyncStorage.setItem(
          SAVED_SESSION_KEY,
          JSON.stringify({ user: localUser, profile: localProfile })
        );
        await recordActivity();
        return { error: null };
      }

      return {
        error: 'Invalid credentials. Enter a valid Member ID and password.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          await fetchProfile(data.user.id);
          await recordActivity();
        }
      }

      return { error: null };
    } catch (err: unknown) {
      return {
        error:
          err instanceof Error
            ? err.message
            : 'An unexpected authentication error occurred.',
      };
    }
  };

  // 2. Admin Create Member directly via RPC (No emails or SMTP needed)
  const adminCreateMember = async (
    username: string,
    displayName: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase configuration required.' };
    }

    try {
      const { data, error } = await supabase.rpc('admin_create_member', {
        member_username: username.trim().toLowerCase(),
        member_display_name: displayName.trim(),
        member_password: password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      const res = data as { success: boolean; error?: string };
      if (!res.success) {
        return { success: false, error: res.error || 'Failed to create member.' };
      }

      await refreshCapacity();
      return { success: true };
    } catch (err: unknown) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to create member.',
      };
    }
  };

  // 3. Fallback methods preserved for future reference
  const requestEmailOtp = async (email: string): Promise<{ error: string | null }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupabaseConfigured) {
      return { error: 'Supabase configuration required.' };
    }
    try {
      const redirectUrl =
        typeof window !== 'undefined' && window.location?.origin
          ? window.location.origin
          : 'http://localhost:8081';
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: true, emailRedirectTo: redirectUrl },
      });
      return { error: error ? error.message : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to send verification code.' };
    }
  };

  const verifyEmailOtp = async (email: string, token: string): Promise<{ error: string | null }> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!isSupabaseConfigured) {
      return { error: 'Supabase configuration required.' };
    }
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: token.trim(),
        type: 'email',
      });
      if (error) return { error: error.message };
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Verification failed.' };
    }
  };

  const setPasswordAndProfile = async (
    password: string,
    displayName: string,
    username: string
  ): Promise<{ error: string | null }> => {
    const cleanName = displayName.trim();
    const cleanUser = username.trim().toLowerCase();
    if (!isSupabaseConfigured) return { error: null };
    try {
      const { data: updateData, error: updateError } = await supabase.auth.updateUser({
        password,
        data: { displayName: cleanName, username: cleanUser },
      });
      if (updateError) return { error: updateError.message };
      const activeUser = updateData.user || user;
      if (activeUser) {
        await supabase.from('profiles').upsert({
          id: activeUser.id,
          username: cleanUser,
          display_name: cleanName,
          updated_at: new Date().toISOString(),
        });
        await fetchProfile(activeUser.id);
        await recordActivity();
        await refreshCapacity();
      }
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to finalize password and profile.' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        wasSessionExpired,
        clearSessionExpiredFlag,
        capacity,
        refreshCapacity,
        recordActivity,
        signIn,
        requestEmailOtp,
        verifyEmailOtp,
        setPasswordAndProfile,
        adminCreateMember,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
