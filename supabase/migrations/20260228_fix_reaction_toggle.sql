CREATE OR REPLACE FUNCTION public.add_reaction_optimized(
  p_post_id uuid DEFAULT NULL::uuid,
  p_comment_id uuid DEFAULT NULL::uuid,
  p_reaction_type text DEFAULT 'love'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  comment_author_id UUID;
  existing_reaction_id UUID;
  existing_reaction_type TEXT;
  result_count INTEGER;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Usuario no autenticado');
  END IF;

  IF (p_post_id IS NULL AND p_comment_id IS NULL) OR (p_post_id IS NOT NULL AND p_comment_id IS NOT NULL) THEN
    RETURN json_build_object('success', false, 'error', 'Debe proporcionar post_id O comment_id, no ambos');
  END IF;

  IF p_comment_id IS NOT NULL THEN
    SELECT user_id INTO comment_author_id FROM comments WHERE id = p_comment_id;
    IF comment_author_id = current_user_id THEN
      RETURN json_build_object('success', false, 'error', 'No puedes reaccionar a tus propios comentarios');
    END IF;
  END IF;

  IF p_post_id IS NOT NULL THEN
    SELECT id, reaction_type INTO existing_reaction_id, existing_reaction_type
    FROM reactions
    WHERE user_id = current_user_id AND post_id = p_post_id;
  ELSE
    SELECT id, reaction_type INTO existing_reaction_id, existing_reaction_type
    FROM reactions
    WHERE user_id = current_user_id AND comment_id = p_comment_id;
  END IF;

  IF existing_reaction_id IS NOT NULL THEN
    IF existing_reaction_type = p_reaction_type THEN
      DELETE FROM reactions WHERE id = existing_reaction_id;
      RETURN json_build_object('success', true, 'action', 'removed', 'reaction_type', NULL);
    ELSE
      UPDATE reactions SET reaction_type = p_reaction_type WHERE id = existing_reaction_id;
      RETURN json_build_object('success', true, 'action', 'changed', 'reaction_type', p_reaction_type);
    END IF;
  END IF;

  INSERT INTO reactions (user_id, post_id, comment_id, reaction_type)
  VALUES (current_user_id, p_post_id, p_comment_id, p_reaction_type);

  GET DIAGNOSTICS result_count = ROW_COUNT;

  IF result_count > 0 THEN
    RETURN json_build_object('success', true, 'action', 'added', 'reaction_type', p_reaction_type);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Error al insertar la reacción');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$function$;
