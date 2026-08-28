-- Crear tabla para códigos promocionales
CREATE TABLE public.promo_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 1 AND discount_percentage <= 100),
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited uses
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = never expires
  created_by UUID DEFAULT auth.uid(),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Políticas para códigos promocionales
CREATE POLICY "Anyone can view active promo codes" 
ON public.promo_codes 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage promo codes" 
ON public.promo_codes 
FOR ALL 
USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true))
WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Crear tabla para registrar uso de códigos promocionales
CREATE TABLE public.promo_code_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  payment_id UUID DEFAULT NULL, -- Referencia al pago donde se usó
  discount_amount NUMERIC NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promo_code_uses ENABLE ROW LEVEL SECURITY;

-- Políticas para uso de códigos
CREATE POLICY "Users can view their own promo code uses" 
ON public.promo_code_uses 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "System can manage promo code uses" 
ON public.promo_code_uses 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Insertar códigos promocionales para beta
INSERT INTO public.promo_codes (code, discount_percentage, description, max_uses)
VALUES 
  ('BETA50', 50, 'Descuento del 50% para beta testers', 100),
  ('WELCOME25', 25, 'Descuento de bienvenida del 25%', NULL),
  ('STUDENT20', 20, 'Descuento especial para estudiantes', 200);

-- Función para validar y aplicar código promocional
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  code_param TEXT,
  user_id_param UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  promo_record RECORD;
  user_uses_count INTEGER;
  result JSON;
BEGIN
  -- Si no hay user_id, usar el usuario autenticado
  IF user_id_param IS NULL THEN
    user_id_param := auth.uid();
  END IF;
  
  -- Buscar el código promocional
  SELECT * INTO promo_record
  FROM public.promo_codes
  WHERE code = UPPER(code_param)
    AND is_active = true
    AND (valid_from IS NULL OR valid_from <= now())
    AND (valid_until IS NULL OR valid_until >= now());
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Código promocional no válido o expirado'
    );
  END IF;
  
  -- Verificar límite de usos totales
  IF promo_record.max_uses IS NOT NULL AND promo_record.current_uses >= promo_record.max_uses THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Este código promocional ha alcanzado su límite de usos'
    );
  END IF;
  
  -- Verificar si el usuario ya usó este código (máximo 1 vez por usuario)
  SELECT COUNT(*) INTO user_uses_count
  FROM public.promo_code_uses
  WHERE promo_code_id = promo_record.id
    AND user_id = user_id_param;
  
  IF user_uses_count > 0 THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'Ya has usado este código promocional'
    );
  END IF;
  
  -- Código válido
  RETURN json_build_object(
    'valid', true,
    'code', promo_record.code,
    'discount_percentage', promo_record.discount_percentage,
    'description', promo_record.description,
    'id', promo_record.id
  );
END;
$$;