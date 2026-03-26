import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSuperuser() {
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSuperuserStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsSuperuser(false);
          setLoading(false);
          return;
        }

        // Check if user is moderator
        const { data: isMod, error: modError } = await (supabase.rpc as any)('has_role', {
          _role: 'moderator',
          _user_id: user.id
        });
        
        if (!modError && isMod) {
          setIsSuperuser(true);
          setLoading(false);
          return;
        }

        // Check if user is admin
        const { data: isAdmin, error: adminError } = await (supabase.rpc as any)('has_role', {
          _role: 'admin',
          _user_id: user.id
        });
        
        if (!adminError && isAdmin) {
          setIsSuperuser(true);
        } else {
          setIsSuperuser(false);
        }
      } catch {
        setIsSuperuser(false);
      } finally {
        setLoading(false);
      }
    };

    checkSuperuserStatus();
  }, []);

  return { isSuperuser, loading };
}
