-- Agregar foreign keys a la tabla reactions (only if reactions table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        ALTER TABLE public.reactions 
        ADD CONSTRAINT reactions_user_id_fkey 
        FOREIGN KEY (user_id) 
        REFERENCES public.profiles(id) 
        ON DELETE CASCADE;

        ALTER TABLE public.reactions 
        ADD CONSTRAINT reactions_post_id_fkey 
        FOREIGN KEY (post_id) 
        REFERENCES public.posts(id) 
        ON DELETE CASCADE;

        ALTER TABLE public.reactions 
        ADD CONSTRAINT reactions_comment_id_fkey 
        FOREIGN KEY (comment_id) 
        REFERENCES public.comments(id) 
        ON DELETE CASCADE;
    END IF;
END $$;