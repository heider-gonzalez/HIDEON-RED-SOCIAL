-- University email verification system

CREATE TABLE IF NOT EXISTS public.university_email_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id text NOT NULL UNIQUE,
  institution_name text NOT NULL,
  email_domain text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.university_email_domains (institution_id, institution_name, email_domain) VALUES
  ('uninorte', 'Universidad del Norte (Uninorte)', '@uninorte.edu.co'),
  ('uniatlantico', 'Universidad del Atlántico', '@mail.uniatlantico.edu.co'),
  ('cuc', 'Universidad de la Costa (CUC)', '@cuc.edu.co'),
  ('unireformada', 'Corporación Universitaria Reformada', '@unireformada.edu.co'),
  ('unisimon', 'Universidad Simón Bolívar', '@unisimonbolivar.edu.co'),
  ('uac', 'Universidad Autónoma del Caribe', '@uac.edu.co'),
  ('unilibre', 'Universidad Libre Seccional Barranquilla', '@unilibre.edu.co'),
  ('americana', 'Corporación Universitaria Americana', '@americana.edu.co'),
  ('unimet', 'Universidad Metropolitana', '@unimetro.edu.co'),
  ('iub', 'Institución Universitaria de Barranquilla (IUB)', '@iub.edu.co'),
  ('unipau', 'Corporación Universitaria Rafael Núñez', '@curnvirtual.edu.co'),
  ('itpca', 'Politécnico Costa Atlántica', '@pca.edu.co'),
  ('sanmartin', 'Fundación Universitaria San Martín', '@sanmartin.edu.co'),
  ('uniminuto', 'UNIMINUTO Sede Barranquilla', '@uniminuto.edu.co'),
  ('fbc', 'Fundación Bolivariana de Colombia', '@fbc.edu.co'),
  ('sena', 'SENA (Nodos Barranquilla)', '@misena.edu.co')
ON CONFLICT (institution_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.university_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution_id text NOT NULL,
  institutional_email text NOT NULL,
  verification_code text,
  code_expires_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id),
  UNIQUE (institutional_email)
);

CREATE INDEX IF NOT EXISTS idx_university_verifications_user_id
  ON public.university_verifications(user_id);

CREATE INDEX IF NOT EXISTS idx_university_verifications_institution_id
  ON public.university_verifications(institution_id);

ALTER TABLE public.university_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.university_email_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS university_email_domains_select ON public.university_email_domains;
CREATE POLICY university_email_domains_select
  ON public.university_email_domains
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS university_verifications_select ON public.university_verifications;
CREATE POLICY university_verifications_select
  ON public.university_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS university_verifications_insert ON public.university_verifications;
CREATE POLICY university_verifications_insert
  ON public.university_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS university_verifications_update ON public.university_verifications;
CREATE POLICY university_verifications_update
  ON public.university_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.on_university_verified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_institution_name text;
BEGIN
  IF NEW.is_verified = true AND (OLD.is_verified IS DISTINCT FROM true) THEN
    SELECT ued.institution_name INTO v_institution_name
    FROM public.university_email_domains ued
    WHERE ued.institution_id = NEW.institution_id;

    IF v_institution_name IS NOT NULL THEN
      UPDATE public.profiles
      SET institution_name = v_institution_name,
          updated_at = now()
      WHERE id = NEW.user_id;

      INSERT INTO public.profile_badges (profile_id, badge_type, badge_name, badge_description, badge_icon, badge_color, is_active)
      VALUES (
        NEW.user_id,
        'verified',
        'Estudiante Verificado',
        'Verificado con correo institucional de ' || v_institution_name,
        'shield',
        'success',
        true
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_university_verified ON public.university_verifications;
CREATE TRIGGER trg_on_university_verified
  AFTER UPDATE ON public.university_verifications
  FOR EACH ROW
  EXECUTE FUNCTION public.on_university_verified();

CREATE OR REPLACE FUNCTION public.request_university_verification(
  p_institutional_email text,
  p_institution_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_domain text;
  v_expected_domain text;
  v_code text;
  v_existing record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No autenticado');
  END IF;

  v_domain := '@' || split_part(lower(p_institutional_email), '@', 2);

  SELECT email_domain INTO v_expected_domain
  FROM public.university_email_domains
  WHERE institution_id = p_institution_id
    AND is_active = true;

  IF v_expected_domain IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Institución no encontrada');
  END IF;

  IF lower(v_domain) <> lower(v_expected_domain) THEN
    RETURN json_build_object('success', false, 'error', 'El dominio del correo no coincide con la institución seleccionada');
  END IF;

  SELECT * INTO v_existing
  FROM public.university_verifications
  WHERE user_id = v_user_id;

  IF v_existing IS NOT NULL AND v_existing.is_verified = true THEN
    RETURN json_build_object('success', false, 'error', 'Ya estás verificado');
  END IF;

  IF v_existing IS NOT NULL AND v_existing.attempts >= 5 AND v_existing.code_expires_at > now() THEN
    RETURN json_build_object('success', false, 'error', 'Demasiados intentos. Intenta más tarde.');
  END IF;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  INSERT INTO public.university_verifications (user_id, institution_id, institutional_email, verification_code, code_expires_at, attempts)
  VALUES (v_user_id, p_institution_id, lower(p_institutional_email), v_code, now() + interval '15 minutes', 0)
  ON CONFLICT (user_id) DO UPDATE SET
    institution_id = EXCLUDED.institution_id,
    institutional_email = EXCLUDED.institutional_email,
    verification_code = EXCLUDED.verification_code,
    code_expires_at = EXCLUDED.code_expires_at,
    attempts = 0,
    updated_at = now();

  RETURN json_build_object('success', true, 'message', 'Código enviado', 'code', v_code);
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_university_code(
  p_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_record record;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No autenticado');
  END IF;

  SELECT * INTO v_record
  FROM public.university_verifications
  WHERE user_id = v_user_id;

  IF v_record IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No hay verificación pendiente');
  END IF;

  IF v_record.is_verified = true THEN
    RETURN json_build_object('success', false, 'error', 'Ya estás verificado');
  END IF;

  IF v_record.code_expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'El código ha expirado. Solicita uno nuevo.');
  END IF;

  IF v_record.attempts >= 5 THEN
    RETURN json_build_object('success', false, 'error', 'Demasiados intentos fallidos. Solicita un nuevo código.');
  END IF;

  UPDATE public.university_verifications
  SET attempts = attempts + 1, updated_at = now()
  WHERE user_id = v_user_id;

  IF v_record.verification_code <> p_code THEN
    RETURN json_build_object('success', false, 'error', 'Código incorrecto');
  END IF;

  UPDATE public.university_verifications
  SET is_verified = true,
      verified_at = now(),
      verification_code = NULL,
      updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true, 'message', 'Verificación exitosa');
END;
$$;
