-- HOTFIX: evitar 500 "Database error saving new user" en Supabase
-- Causa típica: trigger handle_new_user falla al insertar en public.profiles
-- Objetivo: que NUNCA bloquee el signup aunque falle la creación/actualización de perfiles

-- 1) Asegura columnas mínimas en profiles (por si el trigger referencia campos que no existen)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS career text,
  ADD COLUMN IF NOT EXISTS semester text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS institution_name text,
  ADD COLUMN IF NOT EXISTS academic_role text,
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'person',
  ADD COLUMN IF NOT EXISTS person_status text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2) Reemplaza el trigger por una versión "NO BLOCK" (nunca rompe el signup)
CREATE OR REPLACE FUNCTION public.handle_new_user_no_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_username text;
BEGIN
  v_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  BEGIN
    INSERT INTO public.profiles (
      id,
      username,
      avatar_url,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      v_username,
      COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
      now(),
      now()
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION
    WHEN OTHERS THEN
      -- IMPORTANT: nunca romper signup
      NULL;
  END;

  RETURN NEW;
END;
$$;

-- 3) Elimina triggers previos (si existen) y crea uno solo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_final ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_no_block();
