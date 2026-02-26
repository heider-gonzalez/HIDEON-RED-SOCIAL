import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useRegisterMinimal(setLoading: (loading: boolean) => void) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('Starting minimal registration for:', email);
      
      // Registro ULTRA minimalista - solo email y password
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        // SIN metadata para evitar errores de base de datos
      });
      
      console.log('Minimal signup response:', { error, data });
      
      if (error) {
        console.error('Minimal signup error:', error);
        throw error;
      }

      // Si el registro fue exitoso, mostrar mensaje
      if (data.user) {
        toast({
          title: "¡Cuenta creada exitosamente!",
          description: "Tu cuenta ha sido creada. Ahora puedes iniciar sesión.",
        });
        
        // Intentar actualizar perfil DESPUÉS del registro (no crítico)
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Pequeña espera
          
          const { error: profileError } = await (supabase as any)
            .from('profiles')
            .insert({
              id: data.user.id,
              username: username || email.split('@')[0],
              updated_at: new Date().toISOString(),
            });
          
          if (profileError) {
            const code = (profileError as any)?.code as string | undefined;
            const status = (profileError as any)?.status as number | undefined;
            if (code !== '23505' && status !== 409) {
              console.log('Profile update failed (non-critical):', profileError);
            }
          } else {
            console.log('Profile updated successfully');
          }
        } catch (profileError) {
          console.log('Profile update failed (non-critical):', profileError);
        }
      }
    } catch (error: any) {
      console.error('Minimal registration error:', error);
      
      let errorMessage = 'Error al crear la cuenta. Inténtalo de nuevo.';
      
      if (error.message?.includes('User already registered')) {
        errorMessage = 'Este email ya está registrado. Intenta iniciar sesión.';
      } else if (error.message?.includes('Password should be')) {
        errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = 'Email inválido. Verifica el formato.';
      } else if (error.message?.includes('Database error')) {
        errorMessage = 'Error temporal del servidor. Inténtalo en unos minutos.';
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
    handleRegister
  };
}
