-- Create university groups automatically
CREATE OR REPLACE FUNCTION create_university_group(institution_id text, institution_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  group_id uuid;
  slug_name text;
BEGIN
  -- Create a URL-friendly slug
  slug_name := lower(regexp_replace(institution_name, '[^a-zA-Z0-9]+', '-', 'g'));
  slug_name := trim(both '-' from slug_name);
  
  -- Insert the university group
  INSERT INTO public.groups (
    name,
    description,
    slug,
    is_private,
    created_by,
    category,
    tags
  ) VALUES (
    institution_name,
    'Grupo oficial de ' || institution_name || ' - Conecta con estudiantes, profesores y egresados de tu institución.',
    slug_name,
    false,
    '00000000-0000-0000-0000-000000000000', -- System user
    'universidad',
    ARRAY['universidad', 'oficial', institution_id]
  )
  ON CONFLICT (slug) DO NOTHING
  RETURNING id INTO group_id;
  
  -- If group already exists, get its ID
  IF group_id IS NULL THEN
    SELECT id INTO group_id FROM public.groups WHERE slug = slug_name;
  END IF;
  
  RETURN group_id;
END;
$$;

-- Function to auto-join user to university group based on profile
CREATE OR REPLACE FUNCTION auto_join_university_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_institution text;
  university_group_id uuid;
BEGIN
  -- Get user's institution from profile
  SELECT institution_name INTO user_institution
  FROM public.profiles
  WHERE id = NEW.id;
  
  -- If user has an institution, create/find the group and join them
  IF user_institution IS NOT NULL THEN
    -- Create or get university group
    SELECT create_university_group(
      COALESCE(
        (SELECT institution_id FROM unnest(ARRAY[
          'sena', 'eafit', 'unal', 'javeriana', 'andes', 'externado', 
          'rosario', 'udea', 'univalle', 'uis', 'uptc', 'minuto_dios',
          'tecnologico_antioquia', 'politecnico_colombiano', 'otra'
        ]) AS institution_id WHERE 
          lower(user_institution) LIKE '%' || 
          CASE institution_id
            WHEN 'sena' THEN 'sena'
            WHEN 'eafit' THEN 'eafit'
            WHEN 'unal' THEN 'nacional'
            WHEN 'javeriana' THEN 'javeriana'
            WHEN 'andes' THEN 'andes'
            WHEN 'externado' THEN 'externado'
            WHEN 'rosario' THEN 'rosario'
            WHEN 'udea' THEN 'antioquia'
            WHEN 'univalle' THEN 'valle'
            WHEN 'uis' THEN 'santander'
            WHEN 'uptc' THEN 'pedagogica'
            WHEN 'minuto_dios' THEN 'minuto'
            WHEN 'tecnologico_antioquia' THEN 'tecnologico'
            WHEN 'politecnico_colombiano' THEN 'politecnico'
            ELSE 'otra'
          END || '%'
        LIMIT 1),
        'otra'
      ),
      user_institution
    ) INTO university_group_id;
    
    -- Join user to university group as member
    INSERT INTO public.group_members (group_id, user_id, role)
    VALUES (university_group_id, NEW.id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-join users to university groups (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        DROP TRIGGER IF EXISTS trigger_auto_join_university_group ON public.profiles;
        CREATE TRIGGER trigger_auto_join_university_group
          AFTER INSERT OR UPDATE OF institution_name ON public.profiles
          FOR EACH ROW
          EXECUTE FUNCTION auto_join_university_group();
    END IF;
END $$;

-- Enhanced friend suggestions with university priority
CREATE OR REPLACE FUNCTION get_university_friend_suggestions(user_id_param uuid, limit_param integer DEFAULT 20)
RETURNS TABLE(
  id uuid,
  username text,
  avatar_url text,
  career text,
  semester text,
  institution_name text,
  relevance_score integer,
  connection_reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_career text;
  user_semester text;
  user_institution text;
BEGIN
  -- Get current user's profile info
  SELECT p.career, p.semester, p.institution_name 
  INTO user_career, user_semester, user_institution
  FROM public.profiles p
  WHERE p.id = user_id_param;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.avatar_url,
    p.career,
    p.semester,
    p.institution_name,
    -- Enhanced scoring system
    CASE 
      -- Same university + same career = highest priority
      WHEN p.institution_name = user_institution AND p.career = user_career THEN 10
      -- Same university + complementary career = high priority
      WHEN p.institution_name = user_institution AND p.career != user_career THEN 7
      -- Different university + same career = medium priority
      WHEN p.institution_name != user_institution AND p.career = user_career THEN 5
      -- Same semester bonus
      ELSE 0
    END + 
    CASE WHEN p.semester = user_semester THEN 2 ELSE 0 END AS relevance_score,
    -- Connection reason
    CASE 
      WHEN p.institution_name = user_institution AND p.career = user_career THEN 
        'Misma universidad y carrera'
      WHEN p.institution_name = user_institution AND p.career != user_career THEN 
        'Compañero de universidad'
      WHEN p.institution_name != user_institution AND p.career = user_career THEN 
        'Misma carrera, diferente universidad'
      ELSE 'Conexión potencial'
    END AS connection_reason
  FROM public.profiles p
  WHERE p.id != user_id_param
    AND p.id NOT IN (
      -- Exclude existing friends
      SELECT f.friend_id FROM public.friendships f 
      WHERE f.user_id = user_id_param AND f.status = 'accepted'
      UNION
      SELECT f.user_id FROM public.friendships f 
      WHERE f.friend_id = user_id_param AND f.status = 'accepted'
      UNION
      -- Exclude pending requests
      SELECT f.friend_id FROM public.friendships f 
      WHERE f.user_id = user_id_param AND f.status = 'pending'
      UNION
      SELECT f.user_id FROM public.friendships f 
      WHERE f.friend_id = user_id_param AND f.status = 'pending'
    )
    AND p.username IS NOT NULL
  ORDER BY relevance_score DESC, RANDOM()
  LIMIT limit_param;
END;
$$;

-- Create university statistics function
CREATE OR REPLACE FUNCTION get_university_stats(institution_param text)
RETURNS TABLE(
  total_students bigint,
  total_posts bigint,
  total_groups bigint,
  active_this_week bigint,
  top_careers jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total students
    (SELECT COUNT(*) FROM public.profiles WHERE institution_name = institution_param),
    -- Total posts by students from this university
    (SELECT COUNT(*) FROM public.posts p 
     JOIN public.profiles pr ON p.user_id = pr.id 
     WHERE pr.institution_name = institution_param),
    -- Total groups related to this university
    (SELECT COUNT(*) FROM public.groups WHERE category = 'universidad' AND institution_param = ANY(tags)),
    -- Active users this week
    (SELECT COUNT(*) FROM public.profiles 
     WHERE institution_name = institution_param 
     AND last_seen > now() - INTERVAL '7 days'),
    -- Top careers in this university
    (SELECT jsonb_agg(jsonb_build_object('career', career, 'count', student_count))
     FROM (
       SELECT career, COUNT(*) as student_count
       FROM public.profiles 
       WHERE institution_name = institution_param AND career IS NOT NULL
       GROUP BY career 
       ORDER BY student_count DESC 
       LIMIT 5
     ) top_careers_data);
END;
$$;