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
       const missing = msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("unknown column");
       const result = !missing;
       cache.set(key, result);
       return result;
     }

     cache.set(key, true);
     return true;
   } catch {
     // En caso de duda, devolvemos true para no bloquear el feed.
     cache.set(key, true);
     return true;
   }
 }
