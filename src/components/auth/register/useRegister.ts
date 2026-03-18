import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getInstitutionByDomain, institutionsBarranquilla } from "@/data/institutions-barranquilla";

// Dominios permitidos para universidades de Barranquilla
const allowedDomains = [
  '@mail.unireformada.edu.co',
  '@itsa.edu.co', 
  '@mail.uniatlantico.edu.co',
  '@uninorte.edu.co',
  '@unisimon.edu.co'
];

// Función para validar dominio institucional
const validateInstitutionalEmail = (email: string): { isValid: boolean; domain?: string; university?: string } => {
  const trimmedEmail = email.trim().toLowerCase();
  
  // Verificar si el correo termina en uno de los dominios permitidos
  const allowedDomain = allowedDomains.find(domain => trimmedEmail.endsWith(domain));
  
  if (allowedDomain) {
    // Extraer nombre de la universidad del dominio
    const domainParts = allowedDomain.split('.');
    const universityName = domainParts[0]?.replace('@', '') || '';
    
    return {
      isValid: true,
      domain: allowedDomain,
      university: universityName
    };
  }
  
  return {
    isValid: false,
    domain: undefined,
    university: undefined
  };
};

export function useRegister(setLoading: (loading: boolean) => void, sendVerificationEmail: (email: string, username: string) => Promise<any>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<'person' | 'company'>('person');
  const [personStatus, setPersonStatus] = useState<'student' | 'professional' | ''>('');
  const [companyName, setCompanyName] = useState("");
  const [career, setCareer] = useState("");
  const [semester, setSemester] = useState("");
  const [gender, setGender] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [academicRole, setAcademicRole] = useState("");
  const { toast } = useToast();


  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!institutionName.trim()) {
        toast({
          variant: "destructive",
          title: "Universidad requerida",
          description: "Por favor selecciona o escribe tu institución educativa para continuar.",
        });
        return;
      }

      if (!career.trim()) {
        toast({
          variant: "destructive",
          title: "Carrera requerida",
          description: "Por favor escribe tu carrera o profesión para continuar.",
        });
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      
      // Validar correo institucional
      const emailValidation = validateInstitutionalEmail(trimmedEmail);
      
      if (!emailValidation.isValid) {
        toast({
          variant: "destructive",
          title: "Correo no permitido",
          description: "Solo se permiten correos institucionales de universidades de Barranquilla",
        });
        return;
      }

      const institutionByDomain = getInstitutionByDomain(trimmedEmail);
      const autoVerifyEdu =
        Boolean(institutionByDomain) ||
        trimmedEmail.endsWith(".edu") ||
        trimmedEmail.includes(".edu.");

      // Registro simplificado - solo campos básicos
      const { error, data } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            username,
            account_type: accountType,
            person_status: accountType === 'person' ? (personStatus || null) : null,
            company_name: accountType === 'company' ? (companyName || username || null) : null,
            career: career.trim(),
            semester: semester || null,
            gender: gender || null,
            institution_name: institutionName.trim(),
            academic_role: academicRole || null,
          },
          emailRedirectTo: undefined, // Remove redirect to avoid 500 error
        },
      });
      
      if (error) throw error;

      // Actualizar perfil con datos disponibles
      if (data.user) {
        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .insert({
            id: data.user.id,
            username,
            account_type: accountType,
            person_status: accountType === 'person' ? (personStatus || null) : null,
            career: career.trim(),
            semester: semester || null,
            gender: gender || null,
            institution_name: institutionName.trim(),
            academic_role: academicRole || null,
          });
        
        if (profileError) {
          const code = (profileError as any)?.code as string | undefined;
          const status = (profileError as any)?.status as number | undefined;
          if (code !== '23505' && status !== 409) {
            console.error("Error updating profile:", profileError);
          }
        }

        if (autoVerifyEdu) {
          try {
            const normalizeText = (value: string) =>
              value
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim()
                .replace(/\s+/g, " ");

            const instNorm = normalizeText(institutionName);
            const matchedInstitution =
              institutionByDomain ||
              institutionsBarranquilla.find((i) =>
                normalizeText(i.name).includes(instNorm)
              );

            const verificationInstitutionId =
              matchedInstitution?.id && matchedInstitution.id !== "otros"
                ? matchedInstitution.id
                : "otra";

            await (supabase as any)
              .from('university_verifications')
              .insert({
                user_id: data.user.id,
                institution_id: verificationInstitutionId,
                institutional_email: trimmedEmail,
                is_verified: true,
                verified_at: new Date().toISOString(),
              });
          } catch {
            // Best-effort: table/columns might not exist in all environments
          }
        }

        // Si el correo es institucional, asignar al grupo de la universidad
        if (emailValidation.isValid && emailValidation.university) {
          try {
            // Buscar si ya existe un grupo para esta universidad
            const { data: existingGroups } = await supabase
              .from('groups')
              .select('id')
              .eq('name', `${emailValidation.university} - Estudiantes`)
              .maybeSingle();

            if (!existingGroups) {
              // Crear grupo para la universidad si no existe
              await supabase
                .from('groups')
                .insert({
                  name: `${emailValidation.university} - Estudiantes`,
                  description: `Grupo para estudiantes de ${emailValidation.university}`,
                  type: 'university',
                  created_by: data.user.id,
                  is_private: false
                });
            }

            // Añadir usuario al grupo de la universidad
            const { data: groupData } = await supabase
              .from('groups')
              .select('id')
              .eq('name', `${emailValidation.university} - Estudiantes`)
              .single();

            if (groupData) {
              await supabase
                .from('group_members')
                .insert({
                  group_id: groupData.id,
                  user_id: data.user.id,
                  role: 'member',
                  joined_at: new Date().toISOString()
                });
            }
          } catch (error) {
            console.error('Error creating university group:', error);
            // No mostrar error al usuario, solo log para debugging
          }
        }

        toast({
          title: "¡Cuenta creada!",
          description: "Revisa tu email para verificar tu cuenta. Luego podrás iniciar sesión.",
        });
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Error al crear la cuenta. Inténtalo de nuevo.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido. Verifica el formato.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        variant: "destructive",
        title: "Error al crear usuario",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    accountType,
    setAccountType,
    personStatus,
    setPersonStatus,
    companyName,
    setCompanyName,
    career,
    setCareer,
    semester,
    setSemester,
    gender,
    setGender,
    institutionName,
    setInstitutionName,
    academicRole,
    setAcademicRole,
    handleRegister
  };
}
