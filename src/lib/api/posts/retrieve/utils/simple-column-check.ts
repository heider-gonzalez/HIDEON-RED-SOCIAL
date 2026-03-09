 // Versión ultra-simplificada que no usa RPC
// Solución definitiva para evitar errores de Supabase
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, boolean>();

export async function checkColumnExists(tableName: string, columnName: string): Promise<boolean> {
  const key = `${tableName}.${columnName}`;
  if (cache.has(key)) return cache.get(key)!;

  try {
    const { error } = await (supabase as any)
      .from(tableName)
      .select(columnName)
      .limit(1);

    if (error) {
      const msg = String((error as any)?.message || "");
      const code = String((error as any)?.code || "");
      const status = Number((error as any)?.status || 0);

      const msgLower = msg.toLowerCase();
      const missing =
        code.toUpperCase().startsWith("PGRST") ||
        status === 400 ||
        msgLower.includes("does not exist") ||
        msgLower.includes("unknown column") ||
        msgLower.includes("could not find") ||
        msgLower.includes("column") && msgLower.includes("not") && msgLower.includes("found");

      const result = !missing;
      cache.set(key, result);
      return result;
    }

    cache.set(key, true);
    return true;
  } catch {
    cache.set(key, false);
    return false;
  }
}
