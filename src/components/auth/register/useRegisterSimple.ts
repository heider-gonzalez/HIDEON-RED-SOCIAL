import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useRegisterSimple(setLoading: (loading: boolean) => void, sendVerificationEmail: (email: string, username: string) => Promise<any>) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [accountType, setAccountType] = useState<'person' | 'company'>('person');
  const [personStatus, setPersonStatus] = useState<'student' | 'professional' | ''>('');
  const [companyName, setCompanyName] = useState("");
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Starting registration for:', email);
      
      // Registro básico sin opciones problemáticas
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username || email.split('@')[0], // Fallback username
            account_type: accountType,
          },
          // Sin emailRedirectTo para evitar error 500
        },
      });
      
      console.log('Signup response:', { error, data });
      
      if (error) {
        console.error('Signup error:', error);
        throw error;
      }

      // Si el registro fue exitoso, mostrar mensaje
      if (data.user) {
        toast({
          title: "¡Cuenta creada exitosamente!",
          description: "Tu cuenta ha sido creada. Ahora puedes intentar iniciar sesión.",
        });
        
        // Opcional: Actualizar perfil (sin errores críticos si falla)
        try {
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username || email.split('@')[0],
              account_type: accountType,
            });
          
          if (profileError) {
            const code = (profileError as any)?.code as string | undefined;
            const status = (profileError as any)?.status as number | undefined;
            if (code !== '23505' && status !== 409) {
              console.log('Profile update failed (non-critical):', profileError);
            }
          }
        } catch (profileError) {
          console.log('Profile update failed (non-critical):', profileError);
        }
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
        title: "Error en el registro",
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
    handleRegister
  };
}
