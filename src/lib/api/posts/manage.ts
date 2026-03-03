import { supabase } from "@/integrations/supabase/client";

export async function deletePost(postId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('user_id, media_url')
    .eq('id', postId)
    .single();

  if (fetchError) throw fetchError;

  const postRow = post as unknown as { user_id: string | null; media_url: string | null } | null;

  if (postRow && postRow.user_id !== user.id) {
    const [{ data: isMod }, { data: isAdmin }] = await Promise.all([
      (supabase.rpc as any)("has_role", { _role: "moderator", _user_id: user.id }),
      (supabase.rpc as any)("has_role", { _role: "admin", _user_id: user.id }),
    ]);

    if (!Boolean(isMod) && !Boolean(isAdmin)) {
      throw new Error('No tienes permiso para eliminar esta publicación');
    }
  }

  const { error: deleteError } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);

  if (deleteError) throw deleteError;

  if (postRow && postRow.media_url) {
    const url = new URL(postRow.media_url);
    const pathParts = url.pathname.split('/');
    const filePath = pathParts.slice(pathParts.indexOf('media') + 1).join('/');
    if (filePath) {
      await supabase.storage.from('media').remove([filePath]);
    }
  }
}

export async function updatePostVisibility(postId: string, visibility: 'public' | 'friends' | 'private') {
  const { error } = await (supabase as any)
    .from('posts')
    .update({ visibility } as any)
    .eq('id', postId);

  if (error) throw error;
}

export async function hidePost(postId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');
    
    const { data: existingHiddenPost, error: checkError } = await (supabase as any)
      .from('hidden_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error al verificar publicación oculta:", checkError);
      throw checkError;
    }
    
    if (existingHiddenPost) {
      return;
    }
    
    const { error } = await (supabase as any)
      .from('hidden_posts')
      .insert({ 
        post_id: postId,
        user_id: user.id
      } as any);
    
    if (error) {
      console.error("Error al ocultar publicación:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error completo al ocultar publicación:", error);
    throw error;
  }
}

export async function unhidePost(postId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Usuario no autenticado');
    
    const { error } = await (supabase as any)
      .from('hidden_posts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error al mostrar publicación:", error);
      throw error;
    }
  } catch (error) {
    console.error("Error completo al mostrar publicación:", error);
    throw error;
  }
}

export async function getHiddenPosts() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return [];
    
    const { data, error } = await (supabase as any)
      .from('hidden_posts')
      .select('post_id')
      .eq('user_id', user.id);
    
    if (error) {
      console.error("Error al obtener publicaciones ocultas:", error);
      throw error;
    }
    
    return (data as Array<{ post_id: string }>).map((item) => item.post_id);
  } catch (error) {
    console.error("Error completo al obtener publicaciones ocultas:", error);
    return [];
  }
}

export async function setPostInterest(postId: string, interestLevel: 'interested' | 'not_interested') {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');
  
  const { data: existingInterest } = await (supabase as any)
    .from('post_interests')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();
  
  if (existingInterest) {
    const { error } = await (supabase as any)
      .from('post_interests')
      .update({ interest_level: interestLevel } as any)
      .eq('id', (existingInterest as any).id);
    
    if (error) throw error;
  } else {
    const { error } = await (supabase as any)
      .from('post_interests')
      .insert({
        post_id: postId,
        user_id: user.id,
        interest_level: interestLevel
      } as any);
    
    if (error) throw error;
  }
}

export async function updatePost(params: { postId: string; content?: string; visibility?: 'public' | 'friends' | 'private', projectData?: any }) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // First, get the current post to preserve important fields
    const { data: currentPost, error: fetchError } = await (supabase as any)
      .from("posts")
      .select('post_type, project_status, technologies, demo_url, github_url, image_url, media_urls, post_metadata')
      .eq("id", params.postId)
      .single();

    if (fetchError) {
      console.error("Error fetching current post:", fetchError);
      throw fetchError;
    }

    const updateData: any = {};
    if (params.content !== undefined) updateData.content = params.content;
    if (params.visibility !== undefined) updateData.visibility = params.visibility;
    
    // Handle project-specific updates
    if (params.projectData && currentPost && (currentPost.post_type === 'project' || currentPost.post_type === 'proyecto')) {
      // Preserve post_type
      updateData.post_type = currentPost.post_type;
      
      // Update project metadata
      const currentMetadata = currentPost.post_metadata as any || {};
      const proyectoData = currentMetadata.proyecto || currentMetadata.project || {};
      
      const updatedMetadata = {
        ...currentMetadata,
        proyecto: {
          ...proyectoData,
          title: params.projectData.title || proyectoData.title,
          description: params.projectData.description || proyectoData.description,
          objectives: params.projectData.objectives || proyectoData.objectives,
          technologies: params.projectData.technologies || proyectoData.technologies,
          demo_url: params.projectData.demo_url || proyectoData.demo_url,
          github_url: params.projectData.github_url || proyectoData.github_url,
          status: params.projectData.project_status || proyectoData.status,
          seeking_collaborators: params.projectData.seeking_collaborators || proyectoData.seeking_collaborators
        }
      };
      
      updateData.post_metadata = updatedMetadata;
      
      // Also update direct fields for compatibility
      updateData.project_status = params.projectData.project_status || currentPost.project_status;
      updateData.technologies = params.projectData.technologies || currentPost.technologies;
      updateData.demo_url = params.projectData.demo_url || currentPost.demo_url;
      updateData.github_url = params.projectData.github_url || currentPost.github_url;
      
      // Update content with title if provided
      if (params.projectData.title) {
        updateData.content = params.projectData.title + '\n\n' + (params.projectData.description || '');
      }
    } else {
      // Preserve project-specific fields if it's a project post but no projectData provided
      if (currentPost && (currentPost.post_type === 'project' || currentPost.post_type === 'proyecto')) {
        updateData.post_type = currentPost.post_type;
        if (currentPost.project_status) updateData.project_status = currentPost.project_status;
        if (currentPost.technologies) updateData.technologies = currentPost.technologies;
        if (currentPost.demo_url) updateData.demo_url = currentPost.demo_url;
        if (currentPost.github_url) updateData.github_url = currentPost.github_url;
        if (currentPost.image_url) updateData.image_url = currentPost.image_url;
        if (currentPost.media_urls) updateData.media_urls = currentPost.media_urls;
        if (currentPost.post_metadata) updateData.post_metadata = currentPost.post_metadata;
      }
    }

    const { error } = await (supabase as any)
      .from('posts')
      .update(updateData)
      .eq('id', params.postId)
      .eq('user_id', user.id);
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error("Error updating post:", error);
    return { success: false, error };
  }
}

// hidden_users table removed - stub functions
export async function hideUser(userId: string) {
  console.log('Hide user feature disabled');
}

export async function unhideUser(userId: string) {
  console.log('Unhide user feature disabled');
}
