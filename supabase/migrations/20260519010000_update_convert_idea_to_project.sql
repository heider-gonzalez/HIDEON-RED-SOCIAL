-- Update convert_idea_to_project function to create real project entity
-- This replaces the old behavior that only changed the post status

CREATE OR REPLACE FUNCTION public.convert_idea_to_project(
  post_id_param uuid,
  new_status text DEFAULT 'in_progress'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  post_owner_id uuid;
  idea_data jsonb;
  project_name text;
  project_description text;
  new_project_id uuid;
  existing_project_id uuid;
BEGIN
  -- Verify post exists and is an idea
  SELECT user_id, idea INTO post_owner_id, idea_data
  FROM public.posts
  WHERE id = post_id_param AND post_type = 'idea';
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Post no encontrado o no es una idea'
    );
  END IF;
  
  -- Verify user is the owner
  IF post_owner_id != auth.uid() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No tienes permisos para modificar esta idea'
    );
  END IF;
  
  -- Extract project name and description from idea data
  project_name = COALESCE(idea_data->>'title', 'Proyecto sin título');
  project_description = COALESCE(idea_data->>'description', '');
  
  -- Check if project already exists for this idea
  SELECT id INTO existing_project_id
  FROM public.projects
  WHERE idea_id = post_id_param;
  
  IF existing_project_id IS NOT NULL THEN
    -- Update existing project status
    UPDATE public.projects
    SET 
      status = new_status,
      updated_at = NOW()
    WHERE id = existing_project_id;
    
    -- Update post status as well
    UPDATE public.posts
    SET 
      project_status = new_status,
      updated_at = NOW()
    WHERE id = post_id_param;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Estado del proyecto actualizado',
      'project_id', existing_project_id,
      'project_status', new_status
    );
  END IF;
  
  -- Create new project
  INSERT INTO public.projects (idea_id, name, description, owner_id, status)
  VALUES (post_id_param, project_name, project_description, post_owner_id, new_status)
  RETURNING id INTO new_project_id;
  
  -- Update post status
  UPDATE public.posts
  SET 
    project_status = new_status,
    updated_at = NOW()
  WHERE id = post_id_param;
  
  -- Migrate chat channel from idea to project if exists
  UPDATE public.idea_channels
  SET project_id = new_project_id
  WHERE post_id = post_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Idea convertida a proyecto exitosamente',
    'project_id', new_project_id,
    'project_status', new_status
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.convert_idea_to_project(uuid, text) TO authenticated;
