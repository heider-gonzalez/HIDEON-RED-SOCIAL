-- Recreate reactions table (was accidentally dropped) - only if posts table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE TABLE IF NOT EXISTS public.reactions (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
          comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
          reaction_type text NOT NULL CHECK (reaction_type IN ('love', 'awesome', 'join')),
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          CONSTRAINT reactions_target_check CHECK (
            (post_id IS NOT NULL AND comment_id IS NULL) OR 
            (post_id IS NULL AND comment_id IS NOT NULL)
          ),
          CONSTRAINT reactions_unique_user_post UNIQUE (user_id, post_id),
          CONSTRAINT reactions_unique_user_comment UNIQUE (user_id, comment_id)
        );

        -- RLS policies for reactions
        ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Anyone can view reactions" ON public.reactions
          FOR SELECT USING (true);

        CREATE POLICY "Users can create reactions" ON public.reactions
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their reactions" ON public.reactions
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their reactions" ON public.reactions
          FOR DELETE USING (auth.uid() = user_id);

        -- Create saved_posts table
        CREATE TABLE IF NOT EXISTS public.saved_posts (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          UNIQUE(user_id, post_id)
        );

        -- RLS policies for saved_posts
        ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

        CREATE POLICY "Users can view their saved posts" ON public.saved_posts
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can save posts" ON public.saved_posts
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can unsave posts" ON public.saved_posts
          FOR DELETE USING (auth.uid() = user_id);

        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
        CREATE INDEX IF NOT EXISTS idx_reactions_comment_id ON public.reactions(comment_id);
        CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON public.saved_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_saved_posts_post_id ON public.saved_posts(post_id);
    END IF;
END $$;