import { supabase } from "@/integrations/supabase/client";
import { requireAuthUser } from "@/lib/auth/auth-store";

// Temporary access control using profile metadata until proper tables are created
export interface AccessControlConfig {
  allowedDomains: string[];
  invitationCodes: { [key: string]: { institution: string; maxUses: number; currentUses: number } };
  isRestrictedMode: boolean;
}

// For now, store config in a JSON in profiles or a simple approach
const ACCESS_CONFIG: AccessControlConfig = {
  allowedDomains: [
    'sena.edu.co',
    'estudiante.sena.edu.co',
    'aprendiz.sena.edu.co',
    'misena.edu.co'
  ],
  invitationCodes: {
    'SENA2024': { institution: 'SENA', maxUses: 100, currentUses: 0 },
    'HSOCIAL': { institution: 'H Social Beta', maxUses: 50, currentUses: 0 },
    'PILOTO01': { institution: 'SENA Piloto', maxUses: 200, currentUses: 0 }
  },
  isRestrictedMode: true // Set to false to disable access control
};

// Validate invitation code (using local config for now)
export async function validateInvitationCode(code: string) {
  try {
    const upperCode = code.toUpperCase();
    const codeData = ACCESS_CONFIG.invitationCodes[upperCode];
    
    if (!codeData) {
      return { valid: false, message: 'Código de invitación inválido' };
    }

    if (codeData.currentUses >= codeData.maxUses) {
      return { valid: false, message: 'Código de invitación agotado' };
    }

    return { 
      valid: true, 
      data: { 
        code: upperCode,
        institution_name: codeData.institution,
        remaining_uses: codeData.maxUses - codeData.currentUses
      }
    };
  } catch (error) {
    console.error('Error validating invitation code:', error);
    return { valid: false, message: 'Error validando código' };
  }
}

// Use invitation code (store usage in profile metadata)
export async function useInvitationCode(code: string) {
  try {
    const user = requireAuthUser();

    const upperCode = code.toUpperCase();
    
    // Update user profile with invitation code info
    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        invitation_code_used: upperCode,
        institution_name: ACCESS_CONFIG.invitationCodes[upperCode]?.institution,
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', user.id);

    if (error) throw error;

    // Increment usage (in real implementation, this would be in the database)
    ACCESS_CONFIG.invitationCodes[upperCode].currentUses++;

    return { success: true };
  } catch (error) {
    console.error('Error using invitation code:', error);
    return { success: false, message: 'Error usando código de invitación' };
  }
}

// Validate email domain
export async function validateEmailDomain(email: string) {
  try {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return { valid: false, message: 'Email inválido' };

    const isAllowed = ACCESS_CONFIG.allowedDomains.includes(domain);

    return { 
      valid: isAllowed, 
      data: isAllowed ? { domain, institution_name: 'SENA' } : null,
      message: isAllowed ? undefined : 'Dominio de email no autorizado para el piloto'
    };
  } catch (error) {
    console.error('Error validating email domain:', error);
    return { valid: false, message: 'Error validando dominio' };
  }
}

// Check if registration is allowed
export async function checkRegistrationAllowed(email: string, invitationCode?: string) {
  // Skip access control if not in restricted mode
  if (!ACCESS_CONFIG.isRestrictedMode) {
    return { allowed: true, method: 'unrestricted' };
  }

  // First check invitation code if provided
  if (invitationCode) {
    const codeValidation = await validateInvitationCode(invitationCode);
    if (codeValidation.valid) {
      return { allowed: true, method: 'invitation_code', data: codeValidation.data };
    }
  }

  // Then check email domain
  const domainValidation = await validateEmailDomain(email);
  if (domainValidation.valid) {
    return { allowed: true, method: 'domain_whitelist', data: domainValidation.data };
  }

  return { 
    allowed: false, 
    message: 'Acceso restringido. Necesitas un código de invitación válido o un email institucional autorizado.' 
  };
}

// Get user's institution info (from profile metadata for now)
export async function getUserInstitution(userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('invitation_code_used, institution_name')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    console.error('Error getting user institution:', error);
    return null;
  }
}

// Admin functions to manage access control
export function getAccessControlConfig() {
  return ACCESS_CONFIG;
}

export function updateAccessControlConfig(updates: Partial<AccessControlConfig>) {
  Object.assign(ACCESS_CONFIG, updates);
}