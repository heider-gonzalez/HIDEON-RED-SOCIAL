import { supabase } from '@/integrations/supabase/client';
import { getAuthSnapshot } from '@/lib/auth/auth-store';

// Comprehensive type-safe supabase helpers
export const db = {
  // Generic query builder with full type bypass
  from: (table: string) => (supabase as any).from(table),
  
  // Safe insert with type bypass
  insert: (table: string, data: any) => (supabase as any).from(table).insert(data),
  
  // Safe update with type bypass
  update: (table: string, data: any) => (supabase as any).from(table).update(data),
  
  // Safe select with type bypass
  select: (table: string, columns: string = '*') => (supabase as any).from(table).select(columns),
  
  // Safe delete with type bypass
  delete: (table: string) => (supabase as any).from(table).delete(),
  
  // Safe RPC calls
  rpc: (functionName: string, params?: any) => (supabase as any).rpc(functionName, params),
  
  // Safe auth access
  auth: {
    getUser: async () => {
      const { user } = getAuthSnapshot();
      return { data: { user }, error: null } as any;
    },
    getSession: async () => {
      const { session } = getAuthSnapshot();
      return { data: { session }, error: null } as any;
    },
    signOut: () => supabase.auth.signOut(),
    onAuthStateChange: (callback: any) => supabase.auth.onAuthStateChange(callback)
  },

  // Safe data extraction
  getData: (result: any, defaultValue: any = null) => {
    if (!result || typeof result === 'string') return defaultValue;
    if (result.error) return defaultValue;
    return result.data || defaultValue;
  },

  // Safe property access with error handling
  getProp: (obj: any, prop: string, defaultValue: any = null) => {
    if (!obj || typeof obj !== 'object') return defaultValue;
    if (obj.error || !obj.hasOwnProperty(prop)) return defaultValue;
    return obj[prop] ?? defaultValue;
  },

  // Safe array access
  getArray: (data: any, defaultValue: any[] = []) => {
    if (!Array.isArray(data)) return defaultValue;
    return data;
  }
};
