import { supabase } from "@/integrations/supabase/client";
import { getAuthSnapshot } from "@/lib/auth/auth-store";

export async function getPostSharesCount(postId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('post_shares')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      console.error('Error getting shares count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getPostSharesCount:', error);
    return 0;
  }
}

export async function getMultiplePostSharesCounts(postIds: string[]): Promise<Record<string, number>> {
  try {
    const { data, error } = await supabase
      .from('post_shares')
      .select('post_id')
      .in('post_id', postIds);

    if (error) {
      console.error('Error getting multiple shares counts:', error);
      const sharesCounts: Record<string, number> = {};
      postIds.forEach(id => sharesCounts[id] = 0);
      return sharesCounts;
    }

    // Count shares for each post
    const sharesCounts: Record<string, number> = {};
    postIds.forEach(id => sharesCounts[id] = 0);
    
    if (data) {
      (data as any[]).forEach((share: any) => {
        const pid = String(share.post_id || '');
        if (!pid) return;
        sharesCounts[pid] = (sharesCounts[pid] || 0) + 1;
      });
    }

    return sharesCounts;
  } catch (error) {
    console.error('Error in getMultiplePostSharesCounts:', error);
    const sharesCounts: Record<string, number> = {};
    postIds.forEach(id => sharesCounts[id] = 0);
    return sharesCounts;
  }
}

export async function sharePost(postId: string, shareType: 'profile' | 'link' | 'external' = 'profile', shareComment?: string): Promise<boolean> {
  console.log(' [sharePost] Iniciando registro de compartir:', { postId, shareType, hasComment: !!shareComment });
  
  try {
    // 1. Obtener sesión
    console.log(' [sharePost] Obteniendo sesión de usuario...');
    const { session } = getAuthSnapshot();
    const userId = session?.user?.id;
    console.log(' [sharePost] Usuario ID:', userId || 'NO ENCONTRADO');
    
    if (!userId) {
      console.error(' [sharePost] Usuario no autenticado');
      return false;
    }

    // 2. Insertar en post_shares
    console.log(' [sharePost] Insertando en post_shares...');
    const shareData = {
      post_id: postId,
      user_id: userId,
      share_type: shareType,
      share_comment: shareComment || null
    };
    
    console.log(' [sharePost] Datos a insertar:', shareData);
    const { error: insertError } = await (supabase as any)
      .from('post_shares')
      .insert(shareData as any);

    if (insertError) {
      console.error(' [sharePost] Error insertando en post_shares:', insertError);
      return false;
    }

    console.log(' [sharePost] Compartir registrado exitosamente');
    console.log('✅ [sharePost] Compartir registrado exitosamente');
    return true;
    
  } catch (error) {
    console.error('❌ [sharePost] Error inesperado:', error);
    return false;
  }
}