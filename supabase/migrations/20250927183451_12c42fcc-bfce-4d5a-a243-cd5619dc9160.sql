-- Fix foreign key relationships for followers table (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        ALTER TABLE public.followers
        ADD CONSTRAINT followers_follower_id_fkey 
        FOREIGN KEY (follower_id) REFERENCES profiles(id) ON DELETE CASCADE;

        ALTER TABLE public.followers
        ADD CONSTRAINT followers_following_id_fkey 
        FOREIGN KEY (following_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;