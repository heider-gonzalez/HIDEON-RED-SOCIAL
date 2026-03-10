-- Primero verificar si existen los campos
DO $$
BEGIN
    -- Agregar campos de estado de conexión si no existen
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_seen') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen timestamp with time zone;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'status') THEN
        ALTER TABLE public.profiles ADD COLUMN status text CHECK (status IN ('online', 'offline', 'away')) DEFAULT 'offline';
    END IF;
END $$;

-- Función para actualizar last_seen automáticamente
CREATE OR REPLACE FUNCTION public.update_user_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles 
  SET last_seen = now(), status = 'online'
  WHERE id = auth.uid();
  RETURN NULL;
END;
$$;

-- Función para marcar usuario como offline después de inactividad
CREATE OR REPLACE FUNCTION public.mark_users_offline()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET status = 'offline'
  WHERE last_seen < now() - interval '5 minutes'
  AND status = 'online';
END;
$$;