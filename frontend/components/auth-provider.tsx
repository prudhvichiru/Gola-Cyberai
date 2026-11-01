'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase-client';
import type { UserProfile as Profile } from '@/types/user.types';
import type { UserRole as Role } from '@/constants/roles';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Use a ref to track current user without triggering re-renders / dep changes
  const userRef = useRef<User | null>(null);

  const loadProfile = useCallback(
    async (uid: string, currentUser?: User | null) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (!error && data) {
          setProfile(data as Profile);
          return;
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }

      // Fallback: build a profile from user metadata
      const activeUser = currentUser ?? userRef.current;
      const meta = activeUser?.user_metadata || {};
      const isAdmin = activeUser?.email === 'golacyberai@gmail.com' || meta.role === 'admin';

      setProfile({
        id: uid,
        email: activeUser?.email || '',
        first_name: (meta.first_name as string) || (isAdmin ? 'Gola' : ''),
        last_name: (meta.last_name as string) || (isAdmin ? 'CyberAI' : ''),
        full_name: (meta.full_name as string) || (isAdmin ? 'Gola CyberAI' : (activeUser?.email?.split('@')[0] || 'User')),
        employee_id: isAdmin ? 'GCA-ADMIN' : 'GCA-1001',
        role: (isAdmin ? 'admin' : ((meta.role as Role) || 'employee')) as Role,
        status: 'active',
        department_id: null,
        designation_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as Profile);
    },
    [supabase], // removed `user` — use userRef to avoid re-creating this on every setUser()
  );

  const refreshProfile = useCallback(async () => {
    const u = userRef.current;
    if (u?.id) await loadProfile(u.id, u);
  }, [loadProfile]);

  useEffect(() => {
    // Use onAuthStateChange only (it fires INITIAL_SESSION immediately on mount).
    // Calling getSession() separately caused double requests and a re-render
    // that recreated loadProfile, which re-ran this effect in an infinite loop.
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      const u = newSession?.user ?? null;
      setUser(u);
      userRef.current = u;

      if (u) {
        loadProfile(u.id, u).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]); // supabase is a stable singleton; loadProfile is now stable too

  const hasRole = useCallback(
    (...roles: Role[]) => {
      if (!profile) return false;
      return roles.includes(profile.role);
    },
    [profile],
  );

  const signOut = useCallback(async () => {
    // 1. Instantly clear in-memory authentication states
    setSession(null);
    setUser(null);
    setProfile(null);
    setLoading(false);

    // 2. Instantly purge all Supabase session cookies & localStorage keys
    try {
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }
    } catch {
      // ignore storage access errors
    }

    // 3. Fire remote Supabase signOut with a short 800ms timeout so network latency NEVER hangs the UI
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]);
    } catch {
      // ignore network errors on signout
    }

    // 4. Instant hard redirect to sign-in page to reset app context
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, refreshProfile, hasRole, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}