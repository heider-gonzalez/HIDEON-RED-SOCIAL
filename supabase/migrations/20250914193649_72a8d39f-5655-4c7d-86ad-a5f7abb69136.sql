-- Optimización 1: Arreglar política de notifications para mejor performance (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        -- Eliminar política actual con problema de performance
        DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

        -- Crear nueva política optimizada que evalúa auth.uid() una sola vez por statement
        CREATE POLICY "Users can delete their own notifications - optimized" 
        ON public.notifications 
        FOR DELETE 
        TO authenticated 
        USING ((SELECT auth.uid()) = receiver_id);

        -- Agregar índice para mejorar performance de queries en notifications
        CREATE INDEX IF NOT EXISTS idx_notifications_receiver_id ON public.notifications(receiver_id);
    END IF;
END $$;

-- Optimización 2: Consolidar políticas múltiples en user_reputation
-- Primero verificar si la tabla user_reputation existe
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_reputation' AND table_schema = 'public') THEN
    -- Eliminar políticas existentes que causan conflicto
    DROP POLICY IF EXISTS "Anyone can view reputation" ON public.user_reputation;
    DROP POLICY IF EXISTS "System can manage reputation" ON public.user_reputation;
    
    -- Crear política consolidada más específica
    CREATE POLICY "View reputation policy" 
    ON public.user_reputation 
    FOR SELECT 
    TO authenticated 
    USING (true);
    
    -- Política para operaciones de sistema (INSERT, UPDATE, DELETE)
    CREATE POLICY "System manage reputation" 
    ON public.user_reputation 
    FOR ALL 
    TO authenticated 
    USING ((SELECT auth.uid()) = user_id)
    WITH CHECK ((SELECT auth.uid()) = user_id);
    
    -- Agregar índice para mejorar performance
    CREATE INDEX IF NOT EXISTS idx_user_reputation_user_id ON public.user_reputation(user_id);
  END IF;
END $$;