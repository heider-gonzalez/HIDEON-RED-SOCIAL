import { supabase } from "@/integrations/supabase/client";

/**
 * Cleanup corrupted authentication tokens and refresh session
 */
export async function cleanupAuthState() {
  try {
    const isDev = !!(import.meta as any)?.env?.DEV;
    if (isDev) console.log('🧹 Cleaning up authentication state...');
    
    // Remove potentially corrupted tokens from localStorage
    const keysToRemove = [
      'supabase.auth.token',
      'supabase.auth.refresh-token',
      'sb-wgbbaxvuuinubkgffpiq-auth-token',
      'sb-wgbbaxvuuinubkgffpiq-auth-token-code-verifier'
    ];
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Try to refresh the session
    const { data, error } = await supabase.auth.refreshSession();
    
    if (error) {
      const isDev = !!(import.meta as any)?.env?.DEV;
      if (isDev) console.log('🔄 Session refresh failed, signing out...', error);
      await supabase.auth.signOut();
      return { success: false, error };
    }
    
    const isDev2 = !!(import.meta as any)?.env?.DEV;
    if (isDev2) console.log('✅ Authentication state cleaned successfully');
    return { success: true, data };
    
  } catch (error) {
    console.error('❌ Failed to cleanup auth state:', error);
    
    // Force sign out as a last resort
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      console.error('❌ Failed to sign out:', signOutError);
    }
    
    return { success: false, error };
  }
}

/**
 * Verify current authentication state and clean if needed
 */
export async function verifyAuthState(): Promise<boolean> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      const isDev = !!(import.meta as any)?.env?.DEV;
      if (isDev) console.log('🔍 Auth verification failed, cleaning up...', error);
      await cleanupAuthState();
      return false;
    }
    
    if (!session) {
      const isDev = !!(import.meta as any)?.env?.DEV;
      if (isDev) console.log('🔍 No active session found');
      return false;
    }
    
    const isDev2 = !!(import.meta as any)?.env?.DEV;
    if (isDev2) console.log('✅ Auth state verified successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Auth verification error:', error);
    await cleanupAuthState();
    return false;
  }
}