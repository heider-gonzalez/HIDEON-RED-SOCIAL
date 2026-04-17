
import { supabase } from "@/integrations/supabase/client";
import { getAuthSnapshot } from "@/lib/auth/auth-store";

export async function sendVerificationEmail(email: string, username: string) {
  try {
    console.log("Enviando correo de verificación a:", email);
    
    // Definir la URL de la función directamente
    const functionsUrl = "https://wgbbaxvuuinubkgffpiq.supabase.co/functions/v1/send-verification";
    
    console.log("URL de la función:", functionsUrl);
    
    // Obtenemos el token de la sesión actual para autorización
    const { session } = getAuthSnapshot();
    const token = session?.access_token || '';
    
    const response = await fetch(functionsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ email, username }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error("Error en la respuesta:", data);
      throw new Error(data.error || "Error al enviar el correo de verificación");
    }
    
    console.log("Respuesta del servidor:", data);
    return data;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw error;
  }
}
