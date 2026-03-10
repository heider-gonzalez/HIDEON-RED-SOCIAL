-- Primero, actualizar la función handle_new_user para manejar mejor los datos de Google OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Extraer datos del usuario de Google OAuth o registro manual
  INSERT INTO public.profiles (
    id,
    username,
    career,
    semester,
    birth_date
  ) VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      SPLIT_PART(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'career',
    new.raw_user_meta_data->>'semester',
    CASE 
      WHEN new.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END
  );
  
  RETURN new;
END;
$$;