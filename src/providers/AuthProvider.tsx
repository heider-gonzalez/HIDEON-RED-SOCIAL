
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { performanceMonitor } from '@/utils/performance-monitor';
import { useToast } from '@/hooks/use-toast';

function clearSupabaseAuthStorage() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/^sb-.*-auth-token$/.test(key)) keysToRemove.push(key);
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Best-effort
  }
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
});

function isNetworkError(error: any): boolean {
  const message = String(error?.message ?? error ?? '');
  return (
    error instanceof TypeError ||
    message.includes('Failed to fetch') ||
    message.includes('ERR_EMPTY_RESPONSE') ||
    message.toLowerCase().includes('network')
  );
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isNetworkError(error) || attempt === retries) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const presenceIntervalRef = useRef<number | null>(null);
  const userIdRef = useRef<string | null>(null);
  const debug = import.meta.env.DEV;
  const { toast } = useToast();
  
  // Cache for profile existence checks to avoid repeated DB queries
  const profileCacheRef = useRef<Map<string, boolean>>(new Map());

  const buildProfilePayload = (u: User) => {
    const username =
      u.user_metadata?.name ||
      u.user_metadata?.full_name ||
      u.email?.split('@')[0] ||
      'Usuario';

    return {
      id: u.id,
      username,
      career: u.user_metadata?.career || null,
      semester: u.user_metadata?.semester || null,
      birth_date: u.user_metadata?.birth_date || null,
      account_type: u.user_metadata?.account_type || 'person',
      person_status: u.user_metadata?.person_status || null,
      updated_at: new Date().toISOString(),
    };
  };

  useEffect(() => {
    if (debug) console.log('🔐 AuthProvider: Setting up auth listener...');

    const slowAuthTimer = window.setTimeout(() => {
      setLoading((prev) => (prev ? false : prev));
    }, 1200);
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (debug) console.log('🔐 AuthProvider: Auth event:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ?? null);
        userIdRef.current = session?.user?.id ?? null;
        
        // Handle profile creation for new users
        if (event === 'SIGNED_IN' && session?.user) {
          // 🚀 Performance monitoring start
          const trackingId = performanceMonitor.startAuthTracking(session.user.id);
          
          // Optimized: Remove setTimeout and handle async properly
          (async () => {
            try {
              const cached = profileCacheRef.current.has(session.user.id);
              performanceMonitor.markProfileCheck(trackingId, cached);
              
              await ensureProfileExists(session.user);
              performanceMonitor.endAuthTracking(trackingId);
            } catch (error) {
              performanceMonitor.endAuthTracking(trackingId);
              console.error(`❌ Google Auth Error:`, error);
            }
          })();
        }

        if (event === 'SIGNED_OUT') {
          try {
            const prevUserId = userIdRef.current;
            if (prevUserId) {
              await (supabase as any)
                .from('profiles')
                .update({
                  status: 'offline',
                  last_seen: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', prevUserId);
            }
            userIdRef.current = null;
          } catch {
            // Best-effort
          }
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      window.clearTimeout(slowAuthTimer);
      if (error) {
        if (debug) console.error('🔐 AuthProvider: Error getting session:', error);

        if (isNetworkError(error)) {
          setSession(null);
          setUser(null);
          userIdRef.current = null;
          setLoading(false);
          toast({
            variant: 'destructive',
            title: 'Sin conexión',
            description: 'Revisa tu conexión a internet',
          });
          return;
        }

        const message = (error as any)?.message as string | undefined;
        if (message && message.toLowerCase().includes('invalid refresh token')) {
          clearSupabaseAuthStorage();
          void supabase.auth.signOut();
          window.location.href = '/auth';
          return;
        }

        setLoading(false);
        return;
      }
      
      if (debug) console.log('🔐 AuthProvider: Initial session check:', { hasSession: !!session, userEmail: session?.user?.email });
      setSession(session);
      setUser(session?.user ?? null);
      userIdRef.current = session?.user?.id ?? null;
      setLoading(false);
    });

    return () => {
      if (debug) console.log('🔐 AuthProvider: Cleaning up auth listener');
      window.clearTimeout(slowAuthTimer);
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    let isCancelled = false;

    const setPresence = async (status: 'online' | 'away' | 'offline') => {
      try {
        const now = new Date().toISOString();
        await withRetry(() => ensureProfileExists(user));
        await withRetry(async () => {
          return await (supabase as any)
            .from('profiles')
            .update({
              status,
              last_seen: now,
              updated_at: now,
            })
            .eq('id', user.id);
        });
      } catch {
        // Best-effort
      }
    };

    const syncPresence = async () => {
      if (isCancelled) return;
      const status: 'online' | 'away' = document.visibilityState === 'hidden' ? 'away' : 'online';
      await setPresence(status);
    };

    const handleVisibility = () => {
      void syncPresence();
    };

    const handleBeforeUnload = () => {
      void setPresence('offline');
    };

    void setPresence('online');

    presenceIntervalRef.current = window.setInterval(() => {
      void syncPresence();
    }, 60_000);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (presenceIntervalRef.current) {
        window.clearInterval(presenceIntervalRef.current);
        presenceIntervalRef.current = null;
      }
      void setPresence('offline');
    };
  }, [user?.id]);

  const ensureProfileExists = async (user: User) => {
    try {
      // 🚀 OPTIMIZATION: Check cache first to avoid repeated DB queries
      if (profileCacheRef.current.has(user.id)) {
        if (debug) console.log('🚀 Auth Cache: Profile already cached for user:', user.id);
        return;
      }

      const computed = buildProfilePayload(user);
      const googleName =
        user.user_metadata?.name ||
        user.user_metadata?.full_name ||
        null;

      // 🚀 OPTIMIZATION: Use maybeSingle() instead of full query for better performance
      const { data: existing, error: existingError } = await withRetry(async () => {
        return await (supabase as any)
          .from('profiles')
          .select('id, username, name_manually_edited, career, semester, birth_date, account_type, person_status')
          .eq('id', user.id)
          .maybeSingle();
      });

      if (existingError) throw existingError;

      const existingRow = existing as any;

      // 🚀 OPTIMIZATION: If profile exists, cache and return early
      if (existingRow) {
        profileCacheRef.current.set(user.id, true);
        if (debug) console.log('🚀 Auth Cache: Profile exists, cached for user:', user.id);
        return;
      }

      // IMPORTANT: avoid overwriting DB fields with null values coming from user_metadata.
      // Only set a field when creating a new row OR when DB has null and metadata provides a value.
      const payload: any = {
        id: computed.id,
        google_name: googleName,
        updated_at: computed.updated_at,
      };

      if (!existingRow) {
        Object.assign(payload, computed);
        payload.google_name = googleName;
      }

      // 🚀 OPTIMIZATION: Use insert instead of upsert to avoid onConflict 404
      const { error } = await withRetry(async () => {
        return await (supabase as any)
          .from('profiles')
          .insert(payload)
          .select('id')
          .single();
      });
      
      // Ignore duplicate key / conflict (row created elsewhere in parallel)
      if (error) {
        const code = (error as any)?.code as string | undefined;
        const status = (error as any)?.status as number | undefined;
        if (code !== '23505' && status !== 409) throw error;
      }
      
      profileCacheRef.current.set(user.id, true);
      if (debug) console.log('🚀 Auth Cache: Profile created and cached for user:', user.id);
    } catch (error) {
      if (debug) console.error('❌ Error ensuring profile exists:', error);
      if (isNetworkError(error)) {
        toast({
          variant: 'destructive',
          title: 'Sin conexión',
          description: 'Revisa tu conexión a internet',
        });
      }
      throw error;
    }
  };

  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!session && !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
