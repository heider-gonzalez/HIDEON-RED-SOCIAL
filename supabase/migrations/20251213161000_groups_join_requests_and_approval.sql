CREATE TABLE IF NOT EXISTS public.feature_flags (
  key TEXT PRIMARY KEY,
  value BOOLEAN NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Feature flags are readable" ON public.feature_flags;
CREATE POLICY "Feature flags are readable"
ON public.feature_flags
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Feature flags are immutable" ON public.feature_flags;
CREATE POLICY "Feature flags are immutable"
ON public.feature_flags
FOR ALL
USING (false);

INSERT INTO public.feature_flags(key, value)
VALUES ('requires_group_creation_approval', false)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_feature_flag(flag_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT value FROM public.feature_flags WHERE key = flag_key), false);
$$;

-- Create groups and related tables only if profiles table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.groups (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          slug TEXT NOT NULL UNIQUE,
          avatar_url TEXT,
          cover_url TEXT,
          is_private BOOLEAN NOT NULL DEFAULT false,
          created_by UUID NOT NULL REFERENCES public.profiles(id),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          member_count INTEGER DEFAULT 0,
          post_count INTEGER DEFAULT 0,
          category TEXT,
          tags TEXT[],
          rules TEXT,
          type TEXT,
          status TEXT
        );

        CREATE TABLE IF NOT EXISTS public.group_members (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
          joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          UNIQUE(group_id, user_id)
        );

        ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

        ALTER TABLE public.groups
        ADD COLUMN IF NOT EXISTS type TEXT;

        ALTER TABLE public.groups
        ADD COLUMN IF NOT EXISTS status TEXT;

        UPDATE public.groups
        SET type = COALESCE(type, CASE WHEN slug = 'red-h' THEN 'official' ELSE 'community' END),
            status = COALESCE(status, 'active')
        WHERE type IS NULL OR status IS NULL;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'groups_type_check'
        ) THEN
          ALTER TABLE public.groups
          ADD CONSTRAINT groups_type_check
          CHECK (type IN ('official', 'project', 'community'));
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'groups_status_check'
        ) THEN
          ALTER TABLE public.groups
          ADD CONSTRAINT groups_status_check
          CHECK (status IN ('active', 'pending_approval', 'rejected'));
        END IF;

        ALTER TABLE public.groups
        ALTER COLUMN type SET NOT NULL;

        ALTER TABLE public.groups
        ALTER COLUMN status SET NOT NULL;

        ALTER TABLE public.groups
        ALTER COLUMN type SET DEFAULT 'community';

        ALTER TABLE public.groups
        ALTER COLUMN status SET DEFAULT 'active';

        DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
        DROP POLICY IF EXISTS "Private groups are viewable by members only" ON public.groups;
        DROP POLICY IF EXISTS "Optimized public groups view" ON public.groups;

        DROP POLICY IF EXISTS "Active groups are viewable" ON public.groups;
        DROP POLICY IF EXISTS "Non-active groups are viewable by creator" ON public.groups;
        DROP POLICY IF EXISTS "Users can create non-official groups" ON public.groups;

        CREATE POLICY "Active groups are viewable"
        ON public.groups
        FOR SELECT
        USING (
          status = 'active'
          AND (
            NOT is_private
            OR EXISTS (
              SELECT 1
              FROM public.group_members
              WHERE group_id = id AND user_id = auth.uid()
            )
          )
        );

        CREATE POLICY "Non-active groups are viewable by creator"
        ON public.groups
        FOR SELECT
        USING (
          status <> 'active'
          AND (
            auth.uid() = created_by
            OR EXISTS (
              SELECT 1
              FROM public.group_members
              WHERE group_id = id AND user_id = auth.uid() AND role IN ('admin','moderator')
            )
          )
        );

        DROP POLICY IF EXISTS "Users can create groups" ON public.groups;

        CREATE POLICY "Users can create non-official groups"
        ON public.groups
        FOR INSERT
        WITH CHECK (
          auth.uid() = created_by
          AND type IN ('project', 'community')
          AND (
            (public.get_feature_flag('requires_group_creation_approval') = true AND status = 'pending_approval')
            OR (public.get_feature_flag('requires_group_creation_approval') = false AND status = 'active')
          )
        );

        CREATE TABLE IF NOT EXISTS public.group_join_requests (
          id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
          message TEXT,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
          decided_at TIMESTAMP WITH TIME ZONE,
          decided_by UUID REFERENCES public.profiles(id)
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_group_join_requests_pending_unique
        ON public.group_join_requests(group_id, user_id)
        WHERE status = 'pending';

        CREATE INDEX IF NOT EXISTS idx_group_join_requests_group_status
        ON public.group_join_requests(group_id, status, created_at);

        ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their join requests" ON public.group_join_requests;
        CREATE POLICY "Users can view their join requests"
        ON public.group_join_requests
        FOR SELECT
        USING (
          auth.uid() = user_id
        );

        DROP POLICY IF EXISTS "Group managers can view join requests" ON public.group_join_requests;
        CREATE POLICY "Group managers can view join requests"
        ON public.group_join_requests
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1
            FROM public.group_members
            WHERE group_id = group_join_requests.group_id
              AND user_id = auth.uid()
              AND role IN ('admin','moderator')
          )
        );

        DROP POLICY IF EXISTS "Users can create join requests" ON public.group_join_requests;
        CREATE POLICY "Users can create join requests"
        ON public.group_join_requests
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND status = 'pending'
          AND EXISTS (
            SELECT 1
            FROM public.groups g
            WHERE g.id = group_id
              AND g.status = 'active'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM public.group_members gm
            WHERE gm.group_id = group_id AND gm.user_id = user_id
          )
        );

        DROP POLICY IF EXISTS "Users can cancel join requests" ON public.group_join_requests;
        CREATE POLICY "Users can cancel join requests"
        ON public.group_join_requests
        FOR DELETE
        USING (
          auth.uid() = user_id AND status = 'pending'
        );

        DROP POLICY IF EXISTS "Users can join public groups" ON public.group_members;

        DROP POLICY IF EXISTS "Approved join request can insert member" ON public.group_members;
        CREATE POLICY "Approved join request can insert member"
        ON public.group_members
        FOR INSERT
        WITH CHECK (
          auth.uid() = user_id
          AND EXISTS (
            SELECT 1
            FROM public.group_join_requests r
            WHERE r.group_id = group_members.group_id
              AND r.user_id = group_members.user_id
              AND r.status = 'approved'
          )
        );
    END IF;
END $$;

-- Add group_id column to posts table (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts
        ADD COLUMN IF NOT EXISTS group_id UUID;

        DROP POLICY IF EXISTS "Group posts are viewable by group members" ON public.posts;
        DROP POLICY IF EXISTS "Group members can create posts in their groups" ON public.posts;
        DROP POLICY IF EXISTS "Users can view public posts and their own" ON public.posts;
        DROP POLICY IF EXISTS "View public and own posts" ON public.posts;
        DROP POLICY IF EXISTS "Los usuarios pueden ver posts públicos y los suyos" ON public.posts;

        DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
        DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
        DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear posts" ON public.posts;
        DROP POLICY IF EXISTS "Users can insert their own posts" ON public.posts;

        CREATE POLICY "Users can view posts with group access" ON public.posts
        FOR SELECT
        USING (
          group_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.group_members gm
            JOIN public.groups g ON g.id = gm.group_id
            WHERE gm.group_id = posts.group_id
              AND gm.user_id = (SELECT auth.uid())
              AND g.status = 'active'
          )
        );

        CREATE POLICY "Users can create posts with group access" ON public.posts
        FOR INSERT
        WITH CHECK (
          (SELECT auth.uid()) = user_id
          AND (
            group_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.group_members gm
              JOIN public.groups g ON g.id = gm.group_id
              WHERE gm.group_id = posts.group_id
                AND gm.user_id = (SELECT auth.uid())
                AND g.status = 'active'
            )
          )
        );
    END IF;
END $$;

-- Note: Skipping function creations that depend on groups/profiles tables to avoid validation errors
-- Functions will be created when the required tables exist
