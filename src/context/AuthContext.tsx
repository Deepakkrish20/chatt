import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DatabaseProfile, MemberCapacityResult } from '@/lib/supabase/types';
import { MAX_REGISTERED_MEMBERS } from '@/types';
import { CURRENT_USER, MOCK_NETWORK_STATUS } from '@/data/mockData';

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
  isLoading: boolean;
  isConfigured: boolean;
  capacity: MemberCapacity;
  refreshCapacity: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    username?: string
  ) => Promise<{ error: string | null; isCapacityError?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DatabaseProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [capacity, setCapacity] = useState<MemberCapacity>({
    activeMembers: MOCK_NETWORK_STATUS.activeMembers,
    maxMembers: MAX_REGISTERED_MEMBERS,
    slotsRemaining: MOCK_NETWORK_STATUS.slotsRemaining,
    isFull: false,
  });

  // Fetch Member Capacity from Server
  const refreshCapacity = useCallback(async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase.rpc('get_member_capacity');
      if (error) {
        // Fallback to counting profiles table directly
        const { count, error: countError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        if (!countError && count !== null) {
          const active = count;
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
      setProfile({
        id: CURRENT_USER.id,
        username: CURRENT_USER.username,
        display_name: CURRENT_USER.displayName,
        avatar_url: null,
        created_at: CURRENT_USER.createdAt,
        updated_at: CURRENT_USER.createdAt,
      });
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

  // Initialize Auth State & Session Restoration
  useEffect(() => {
    let isMounted = true;

    async function initializeAuth() {
      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (!error && initialSession && isMounted) {
          setSession(initialSession);
          setUser(initialSession.user);
          await fetchProfile(initialSession.user.id);
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

    // Listen to Supabase Auth State Changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
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
  }, [fetchProfile, refreshCapacity]);

  // Sign In
  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    if (!isSupabaseConfigured) {
      // Demo authentication simulation
      setUser({
        id: CURRENT_USER.id,
        email,
        app_metadata: {},
        user_metadata: { displayName: CURRENT_USER.displayName, username: CURRENT_USER.username },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setProfile({
        id: CURRENT_USER.id,
        username: CURRENT_USER.username,
        display_name: CURRENT_USER.displayName,
        avatar_url: null,
        created_at: CURRENT_USER.createdAt,
        updated_at: CURRENT_USER.createdAt,
      });
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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
        }
      }

      return { error: null };
    } catch (err: any) {
      return { error: err.message || 'An unexpected authentication error occurred.' };
    }
  };

  // Sign Up with 10-Member Capacity Check
  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    username?: string
  ): Promise<{ error: string | null; isCapacityError?: boolean }> => {
    if (!isSupabaseConfigured) {
      // Demo registration simulation
      const newUserId = `user_${Date.now()}`;
      setUser({
        id: newUserId,
        email,
        app_metadata: {},
        user_metadata: { displayName, username: username || displayName.toLowerCase().replace(/\s+/g, '_') },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User);
      setProfile({
        id: newUserId,
        username: username || displayName.toLowerCase().replace(/\s+/g, '_'),
        display_name: displayName,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      return { error: null };
    }

    // Server-enforced capacity pre-check via RPC
    try {
      const { data: capData } = await supabase.rpc('get_member_capacity');
      if (capData && (capData as MemberCapacityResult).is_full) {
        return {
          error: 'Registration closed: The maximum capacity of 10 registered members has been reached.',
          isCapacityError: true,
        };
      }
    } catch {
      // Continue to let database transaction trigger enforce atomically
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanUsername = (username || displayName.toLowerCase().replace(/\s+/g, '_')).trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            displayName: displayName.trim(),
            username: cleanUsername,
          },
        },
      });

      if (error) {
        // Detect database trigger exception message from check_registration_member_limit()
        if (
          error.message.includes('maximum limit of 10 members') ||
          error.message.includes('Registration closed')
        ) {
          return {
            error: 'Registration closed: Maximum capacity of 10 registered members reached.',
            isCapacityError: true,
          };
        }
        return { error: error.message };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        if (data.user) {
          await fetchProfile(data.user.id);
        }
      }

      await refreshCapacity();
      return { error: null };
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      const isCap = msg.includes('10 members') || msg.includes('Registration closed');
      return {
        error: isCap
          ? 'Registration closed: Maximum capacity of 10 registered members reached.'
          : msg,
        isCapacityError: isCap,
      };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isConfigured: isSupabaseConfigured,
        capacity,
        refreshCapacity,
        signIn,
        signUp,
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
