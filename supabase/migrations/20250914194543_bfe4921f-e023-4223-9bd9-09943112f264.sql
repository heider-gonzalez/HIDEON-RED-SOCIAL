-- Corregir advertencias de RLS después de la optimización anterior

-- Issue 1: Eliminar política problemática de notifications que aún existe (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        DROP POLICY IF EXISTS "Allow users to delete their own notifications" ON public.notifications;
    END IF;
END $$;

-- Issue 2: Corregir múltiples políticas permisivas en user_reputation
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_reputation' AND table_schema = 'public') THEN
    
    -- Eliminar las políticas conflictivas que creamos anteriormente
    DROP POLICY IF EXISTS "View reputation policy" ON public.user_reputation;
    DROP POLICY IF EXISTS "System manage reputation" ON public.user_reputation;
    
    -- Crear UNA SOLA política permisiva consolidada para SELECT
    CREATE POLICY "Consolidated reputation access" 
    ON public.user_reputation 
    FOR SELECT 
    TO authenticated 
    USING (
      -- Permitir si es el dueño del registro O si tiene permisos de sistema
      (SELECT auth.uid()) = user_id 
      OR 
      -- Agregar aquí condiciones adicionales si es necesario (ej: admin role)
      true  -- Por ahora permitir a todos los usuarios autenticados
    );
    
    -- Políticas separadas y no conflictivas para otras operaciones
    CREATE POLICY "Users can insert own reputation" 
    ON public.user_reputation 
    FOR INSERT 
    TO authenticated 
    WITH CHECK ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can update own reputation" 
    ON public.user_reputation 
    FOR UPDATE 
    TO authenticated 
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
    
    CREATE POLICY "Users can delete own reputation" 
    ON public.user_reputation 
    FOR DELETE 
    TO authenticated 
    USING ((SELECT auth.uid()) = user_id);
    
  END IF;
END $$;