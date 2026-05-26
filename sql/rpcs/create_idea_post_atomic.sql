-- create_idea_post_atomic.sql
-- Crea un post con el objeto `idea` en la misma transacción y devuelve el post_id
-- Ejecutar en Supabase SQL editor o psql como administrador

CREATE OR REPLACE FUNCTION public.create_idea_post_atomic(
  p_user_id uuid,
  p_content text,
  p_idea jsonb,
  p_visibility text DEFAULT 'public',
  p_media_url text DEFAULT NULL,
  p_media_urls jsonb DEFAULT NULL,
  p_media_type text DEFAULT NULL,
  p_company_id uuid DEFAULT NULL,
  p_group_id uuid DEFAULT NULL
) RETURNS TABLE(post_id uuid) AS $$
DECLARE
  v_post_id uuid;
BEGIN
  INSERT INTO posts(
    user_id, content, idea, visibility, media_url, media_urls, media_type, company_id, group_id, created_at
  ) VALUES (
    p_user_id,
    CASE WHEN p_content IS NULL OR trim(p_content) = '' THEN NULL ELSE p_content END,
    p_idea,
    p_visibility,
    p_media_url,
    p_media_urls,
    p_media_type,
    p_company_id,
    p_group_id,
    now()
  ) RETURNING id INTO v_post_id;

  RETURN QUERY SELECT v_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recomendación: ejecutar CREATE INDEX si es necesario:
-- CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
