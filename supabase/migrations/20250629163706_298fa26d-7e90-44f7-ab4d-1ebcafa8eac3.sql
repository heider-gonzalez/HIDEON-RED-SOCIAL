
-- Crear tabla para manejar suscripciones premium
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'premium',
  status TEXT NOT NULL DEFAULT 'active',
  payment_method TEXT NOT NULL DEFAULT 'nequi',
  payment_reference TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'COP',
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_type)
);

-- Crear tabla para gestionar corazones premium
CREATE TABLE public.premium_hearts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hearts_given_today INTEGER NOT NULL DEFAULT 0,
  hearts_limit INTEGER NOT NULL DEFAULT 1,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Crear tabla para publicaciones incógnitas premium
CREATE TABLE public.premium_incognito_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  anonymous_name TEXT NOT NULL DEFAULT 'Usuario Premium',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id)
);

-- Crear tabla para tracking de pagos con Nequi
CREATE TABLE public.nequi_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_code TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  nequi_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_hearts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.premium_incognito_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nequi_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para subscriptions
CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscriptions" 
  ON public.subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" 
  ON public.subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Políticas para premium_hearts
CREATE POLICY "Users can view their own premium hearts" 
  ON public.premium_hearts 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own premium hearts" 
  ON public.premium_hearts 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage premium hearts" 
  ON public.premium_hearts 
  FOR ALL 
  WITH CHECK (true);

-- Políticas para premium_incognito_posts
CREATE POLICY "Anyone can view incognito posts" 
  ON public.premium_incognito_posts 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create their own incognito posts" 
  ON public.premium_incognito_posts 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Políticas para nequi_payments
CREATE POLICY "Users can view their own payments" 
  ON public.nequi_payments 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage payments" 
  ON public.nequi_payments 
  FOR ALL 
  WITH CHECK (true);

-- Función para verificar si un usuario tiene suscripción premium activa
CREATE OR REPLACE FUNCTION public.is_premium_user(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = user_id_param
      AND status = 'active'
      AND end_date > now()
  );
$$;

-- Función para obtener límite de corazones según suscripción
CREATE OR REPLACE FUNCTION public.get_hearts_limit(user_id_param UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN public.is_premium_user(user_id_param) THEN 5
    ELSE 1
  END;
$$;

-- Función para resetear corazones diarios
CREATE OR REPLACE FUNCTION public.reset_daily_hearts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.premium_hearts
  SET hearts_given_today = 0,
      hearts_limit = public.get_hearts_limit(user_id),
      last_reset_date = CURRENT_DATE,
      updated_at = now()
  WHERE last_reset_date < CURRENT_DATE;
END;
$$;
