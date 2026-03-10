-- Verificar y actualizar el trigger para crear perfiles automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Crear función para manejar nuevos usuarios de OAuth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  ) ON CONFLICT (id) DO UPDATE SET
    username = COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'name', 
      new.raw_user_meta_data->>'full_name',
      SPLIT_PART(new.email, '@', 1),
      profiles.username
    ),
    career = COALESCE(new.raw_user_meta_data->>'career', profiles.career),
    semester = COALESCE(new.raw_user_meta_data->>'semester', profiles.semester);
  
  RETURN new;
END;
$$;

-- Crear trigger para usuarios nuevos
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();