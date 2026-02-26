
import { supabase } from "@/integrations/supabase/client";

// Helper function to check if table exists
export async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Use any type to bypass type checking for tables that might not be in the schema
    const { error } = await supabase
      .from(tableName as any)
      .select('id')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
}
