import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useAuthRedirect() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Handle auth state changes (including OAuth redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session) {
          const provider = session.user?.app_metadata?.provider;
          const isNewUser = session.user?.user_metadata?.is_new_user ?? false;
          const authMode = localStorage.getItem('auth_mode');
          
          // Clean up stored auth mode
          localStorage.removeItem('auth_mode');
          
          if (provider === 'google') {
            // Ensure profile exists for Google users, but only set username/avatar on first registration
            try {
              // Check if profile already exists and has a username
              const { data: existingProfileRow, error: existingProfileError } = await (supabase as any)
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', session.user.id)
                .maybeSingle();

              if (existingProfileError) {
                console.error('Error checking existing profile:', existingProfileError);
              }

              const shouldSetUsername = !existingProfileRow?.username;
              const shouldSetAvatar =
                !existingProfileRow?.avatar_url &&
                (session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture);

              const updateData: any = {
                id: session.user.id,
                updated_at: new Date().toISOString(),
              };

              if (shouldSetUsername) {
                updateData.username = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Usuario';
              }

              if (shouldSetAvatar) {
                updateData.avatar_url = session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture;
              }

              // Only perform upsert if we actually have changes
              if (shouldSetUsername || shouldSetAvatar) {
                // Try update first (works when row already exists)
                const { data: updatedRow, error: updateError } = await (supabase as any)
                  .from('profiles')
                  .update(
                    {
                      ...(shouldSetUsername ? { username: updateData.username } : {}),
                      ...(shouldSetAvatar ? { avatar_url: updateData.avatar_url } : {}),
                      updated_at: updateData.updated_at,
                    } as any
                  )
                  .eq('id', session.user.id)
                  .select('id')
                  .maybeSingle();

                if (updateError) {
                  console.error('Error updating profile for Google user:', updateError);
                }

                // If the profile row doesn't exist yet, insert it (ignore duplicates)
                if (!updatedRow) {
                  const { error: insertError } = await (supabase as any)
                    .from('profiles')
                    .insert(updateData)
                    .select('id')
                    .maybeSingle();

                  if (insertError) {
                    const code = (insertError as any)?.code as string | undefined;
                    const status = (insertError as any)?.status as number | undefined;
                    if (code !== '23505' && status !== 409) {
                      console.error('Error inserting profile for Google user:', insertError);
                    }
                  }
                }
              }
            } catch (error) {
              console.error('Error ensuring profile exists:', error);
            }
            
            // Show appropriate message based on whether it's a new user or login
            if (isNewUser || authMode === 'register') {
              toast({
                title: "¡Bienvenido a HSOCIAL!",
                description: "Tu cuenta ha sido creada exitosamente con Google.",
              });
            } else {
              toast({
                title: "¡Hola de nuevo!",
                description: "Has iniciado sesión correctamente con Google.",
              });
            }
            
            // Redirect to home
            navigate('/', { replace: true });
          } else if (window.location.pathname === '/auth') {
            // For regular auth, only redirect if on auth page
            navigate('/', { replace: true });
          }
        } else if (event === 'SIGNED_OUT') {
          // Only redirect if we're not already on auth page
          if (window.location.pathname !== '/auth') {
            navigate('/auth', { replace: true });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate, toast]);

  return {};
}