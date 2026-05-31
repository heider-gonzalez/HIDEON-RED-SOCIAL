-- Performance indexes for feed and global chat (only if tables exist)

DO $$
BEGIN
    -- Feed: posts ordered by created_at, often filtered by visibility/user_id/group_id/company_id
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_visibility_created_at ON public.posts (visibility, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_user_id_created_at ON public.posts (user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_group_id_created_at ON public.posts (group_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_posts_company_id_created_at ON public.posts (company_id, created_at DESC);
    END IF;

    -- Reactions: feed aggregation and per-user checks
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'reactions') THEN
        CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions (post_id);
        CREATE INDEX IF NOT EXISTS idx_reactions_user_post ON public.reactions (user_id, post_id);
    END IF;

    -- Comments counts / inserts
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'comments') THEN
        CREATE INDEX IF NOT EXISTS idx_comments_post_id_created_at ON public.comments (post_id, created_at DESC);
    END IF;

    -- Global chat: mensajes filtered by channel and ordered by created_at
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'mensajes') THEN
        CREATE INDEX IF NOT EXISTS idx_mensajes_canal_created_at ON public.mensajes (id_canal, created_at);
    END IF;

    -- Notifications: common lookups (receiver_id, read)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications') THEN
        CREATE INDEX IF NOT EXISTS idx_notifications_receiver_read_created_at ON public.notifications (receiver_id, read, created_at DESC);
    END IF;
END $$;
