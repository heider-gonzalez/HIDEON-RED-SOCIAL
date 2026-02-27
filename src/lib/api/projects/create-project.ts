import { supabase } from "@/integrations/supabase/client";
import { uploadToSupabase } from "@/lib/storage/cloudflare-r2";
import type { ProjectFormData } from "@/types/project";

// Accept single File or array of Files for images/documents
export async function createProject(data: ProjectFormData, files?: File | File[]) {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    let imageUrls: string[] = data.image_url ? [data.image_url] : [];

    // Normalize files to array
    const filesArray: File[] = Array.isArray(files) ? files : (files ? [files] : []);

    // Upload each file if provided
    for (const file of filesArray) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `projects/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;
        const url = await uploadToSupabase(file, fileName);
        if (url) imageUrls.push(url);
      } catch (err) {
        console.warn('Failed to upload project file:', err);
      }
    }

    // Create post first
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: data.description,
        visibility: 'public',
        post_type: 'project_showcase',
        media_urls: imageUrls.length > 0 ? imageUrls : null
      })
      .select()
      .single();

    if (postError) throw postError;

    // Create project showcase
    const { data: project, error: projectError } = await supabase
      .from('project_showcases')
      .insert({
        post_id: post.id,
        project_title: data.title,
        project_description: data.description,
        project_status: data.status,
        technologies_used: data.technologies,
        github_url: data.github_url || null,
        demo_url: data.demo_url || null,
        project_url: data.documentation_url || null,
        images_urls: imageUrls,
        seeking_collaborators: data.seeking_collaborators,
        collaboration_roles: data.team_members,
        achievements: data.achievements ? [data.achievements] : [],
        industry: data.category,
        is_academic: data.is_academic
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Add creator as first participant
    const { error: participantError } = await supabase
      .from('idea_participants')
      .insert({
        post_id: post.id,
        user_id: user.id,
        profession: data.category || 'Desarrollador del proyecto'
      });

    if (participantError) {
      console.error('Error adding creator as participant:', participantError);
      // Don't throw, just log - the project is already created
    }

    return { post, project };
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}
