import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      if (!career.trim()) {
        toast({
          variant: "destructive",
          title: "Carrera requerida",
          description: "Por favor escribe tu carrera o profesión para continuar.",
        });
        return;
      }

      // Registro simplificado - solo campos básicos
      const { error, data } = await supabase.auth.signUp({
        email,
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
            institution_name: institutionName || null,
            academic_role: academicRole || null,
          },
          emailRedirectTo: undefined, // Remove redirect to avoid 500 error
        },
      });
      
      if (error) throw error;

      // Actualizar perfil con datos disponibles
      if (data.user) {
        const { error: profileError } = await (supabase as any).from('profiles').upsert({
          id: data.user.id,
          username,
          account_type: accountType,
          person_status: accountType === 'person' ? (personStatus || null) : null,
          career: career.trim(),
          semester: semester || null,
          gender: gender || null,
          institution_name: institutionName || null,
          academic_role: academicRole || null,
        });
        
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      toast({
        title: "¡Cuenta creada!",
        description: "Revisa tu email para verificar tu cuenta. Luego podrás iniciar sesión.",
      });
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
