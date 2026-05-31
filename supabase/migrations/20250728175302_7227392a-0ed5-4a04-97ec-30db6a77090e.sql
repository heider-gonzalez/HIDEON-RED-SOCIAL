-- Agregar columna is_deleted a la tabla messages (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
        ALTER TABLE public.messages 
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

        -- Agregar política para UPDATE en messages
        DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
        CREATE POLICY "Users can update their own messages" 
        ON public.messages 
        FOR UPDATE 
        USING (auth.uid() = sender_id);
    END IF;
END $$;

-- Agregar columna is_deleted a la tabla group_messages (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        ALTER TABLE public.group_messages 
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

        -- Agregar política para UPDATE en group_messages  
        DROP POLICY IF EXISTS "Users can update their own group messages" ON public.group_messages;
        CREATE POLICY "Users can update their own group messages" 
        ON public.group_messages 
        FOR UPDATE 
        USING (auth.uid() = sender_id);

        -- Agregar política para DELETE en group_messages
        DROP POLICY IF EXISTS "Users can delete their own group messages" ON public.group_messages;
        CREATE POLICY "Users can delete their own group messages" 
        ON public.group_messages 
        FOR DELETE 
        USING (auth.uid() = sender_id);
    END IF;
END $$;