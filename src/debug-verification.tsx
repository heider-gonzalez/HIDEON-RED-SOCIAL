import { supabase } from "@/integrations/supabase/client";

// Script temporal para depurar verificación de Alexandra
async function debugAlexandraVerification() {
  const email = "heider.gonzalez@unireformada.edu.co";
  
  try {
    // 1. Buscar usuario por email en profiles
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();
    
    console.log("Profile by email:", { profileData, profileError });
    
    if (!profileData || !profileData.id) {
      console.log("❌ Perfil no encontrado con ese email");
      return;
    }
    
    const userId = profileData.id;
    console.log("✅ Usuario encontrado, ID:", userId);
    
    // 2. Verificar si tiene verificación universitaria
    const { data: verificationData, error: verificationError } = await supabase
      .from("university_verifications")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    console.log("Verification data:", { verificationData, verificationError });
    
    // 3. Verificar si el email está en dominios educativos
    const educationalDomains = [
      "unireformada.edu.co",
      "edu.co",
      ".edu",
      "universidad.edu.co"
    ];
    
    const isEducationalEmail = educationalDomains.some(domain => 
      email.toLowerCase().includes(domain)
    );
    
    console.log("Email analysis:", {
      email,
      isEducationalEmail,
      domains: educationalDomains
    });
    
    // 4. Probar la RPC
    try {
      const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
        "get_verified_user_ids",
        { user_ids: [userId] }
      );
      console.log("RPC result:", { rpcData, rpcError });
    } catch (rpcErr) {
      console.log("RPC error:", rpcErr);
    }
    
  } catch (error) {
    console.error("Error general:", error);
  }
}

// Ejecutar en consola del navegador
// debugAlexandraVerification();

export default debugAlexandraVerification;
