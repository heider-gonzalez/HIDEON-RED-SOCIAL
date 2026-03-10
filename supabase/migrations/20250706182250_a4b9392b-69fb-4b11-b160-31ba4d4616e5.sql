-- Agregar el campo relationship_status a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN relationship_status TEXT;

-- Opcional: Agregar un constraint para los valores válidos
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_relationship_status_check 
CHECK (relationship_status IN ('soltero', 'en_relacion', 'casado', 'es_complicado', 'divorciado', 'viudo', NULL));