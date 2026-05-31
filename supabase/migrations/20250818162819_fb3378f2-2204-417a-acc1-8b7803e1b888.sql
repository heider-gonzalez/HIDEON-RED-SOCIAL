-- Create groups table
CREATE TABLE public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  cover_url TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  category TEXT,
  tags TEXT[],
  rules TEXT
);

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'moderator', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Add group_id to existing posts table (nullable for general posts) - only if posts table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts 
        ADD COLUMN IF NOT EXISTS group_id UUID;
    END IF;
END $$;

-- Add group_id to existing group_messages table (not nullable, will be set later) - only if group_messages table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        ALTER TABLE public.group_messages 
        ADD COLUMN IF NOT EXISTS group_id UUID;
    END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for groups table
CREATE POLICY "Public groups are viewable by everyone" 
ON public.groups 
FOR SELECT 
USING (NOT is_private);

CREATE POLICY "Private groups are viewable by members only" 
ON public.groups 
FOR SELECT 
USING (is_private AND EXISTS (
  SELECT 1 FROM public.group_members 
  WHERE group_id = groups.id AND user_id = auth.uid()
));

CREATE POLICY "Users can create groups" 
ON public.groups 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group creators and admins can update groups" 
ON public.groups 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Group creators and admins can delete groups" 
ON public.groups 
FOR DELETE 
USING (
  auth.uid() = created_by OR 
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for group_members table
CREATE POLICY "Group members can view other members" 
ON public.group_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.group_members gm 
  WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
));

CREATE POLICY "Users can join public groups" 
ON public.group_members 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  EXISTS (
    SELECT 1 FROM public.groups 
    WHERE id = group_id AND NOT is_private
  )
);

CREATE POLICY "Admins can manage group members" 
ON public.group_members 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.group_members 
  WHERE group_id = group_members.group_id AND user_id = auth.uid() AND role IN ('admin', 'moderator')
));

CREATE POLICY "Users can leave groups" 
ON public.group_members 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for posts with group_id (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        DROP POLICY IF EXISTS "Group posts are viewable by group members" ON public.posts;
        CREATE POLICY "Group posts are viewable by group members" 
        ON public.posts 
        FOR SELECT 
        USING (
          group_id IS NULL OR 
          EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = posts.group_id AND user_id = auth.uid()
          )
        );

        DROP POLICY IF EXISTS "Group members can create posts in their groups" ON public.posts;
        CREATE POLICY "Group members can create posts in their groups" 
        ON public.posts 
        FOR INSERT 
        WITH CHECK (
          auth.uid() = user_id AND 
          (group_id IS NULL OR EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = posts.group_id AND user_id = auth.uid()
          ))
        );
    END IF;
END $$;

-- RLS Policies for group_messages with group_id (only if group_messages table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        DROP POLICY IF EXISTS "Group messages are viewable by group members" ON public.group_messages;
        CREATE POLICY "Group messages are viewable by group members" 
        ON public.group_messages 
        FOR SELECT 
        USING (EXISTS (
          SELECT 1 FROM public.group_members 
          WHERE group_id = group_messages.group_id AND user_id = auth.uid()
        ));

        DROP POLICY IF EXISTS "Group members can send messages" ON public.group_messages;
        CREATE POLICY "Group members can send messages" 
        ON public.group_messages 
        FOR INSERT 
        WITH CHECK (
          auth.uid() = sender_id AND 
          EXISTS (
            SELECT 1 FROM public.group_members 
            WHERE group_id = group_messages.group_id AND user_id = auth.uid()
          )
        );
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX idx_groups_slug ON public.groups(slug);
CREATE INDEX idx_groups_is_private ON public.groups(is_private);
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- Index for posts (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        CREATE INDEX IF NOT EXISTS idx_posts_group_id ON public.posts(group_id) WHERE group_id IS NOT NULL;
    END IF;
END $$;

-- Index for group_messages (only if group_messages table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON public.group_messages(group_id);
    END IF;
END $$;

-- Create trigger for updating updated_at on groups
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default "Red H" group and migrate existing data
INSERT INTO public.groups (name, slug, description, is_private, created_by, category)
VALUES (
  'Red H',
  'red-h',
  'Chat global de la comunidad Red H - Conecta con estudiantes y profesionales',
  false,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'general'
);

-- Update all existing group_messages to belong to Red H group (only if group_messages table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        UPDATE public.group_messages 
        SET group_id = (SELECT id FROM public.groups WHERE slug = 'red-h')
        WHERE group_id IS NULL;
    END IF;
END $$;

-- Make group_id NOT NULL in group_messages after migration (only if group_messages table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'group_messages') THEN
        ALTER TABLE public.group_messages 
        ALTER COLUMN group_id SET NOT NULL;
    END IF;
END $$;