-- Companies phase 1: companies, company_members, and posting as company (only if profiles table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
        CREATE TABLE IF NOT EXISTS public.companies (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          name text NOT NULL,
          slug text NOT NULL UNIQUE,
          description text,
          logo_url text,
          cover_url text,
          website_url text,
          created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          created_at timestamp with time zone DEFAULT now(),
          updated_at timestamp with time zone DEFAULT now(),
          status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled'))
        );

        CREATE INDEX IF NOT EXISTS companies_created_by_idx ON public.companies(created_by);
        CREATE INDEX IF NOT EXISTS companies_status_idx ON public.companies(status);

        CREATE TABLE IF NOT EXISTS public.company_members (
          id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
          company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
          user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
          role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','editor','member')),
          created_at timestamp with time zone DEFAULT now(),
          UNIQUE(company_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS company_members_company_id_idx ON public.company_members(company_id);
        CREATE INDEX IF NOT EXISTS company_members_user_id_idx ON public.company_members(user_id);

        ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Anyone can view active companies" ON public.companies;
        DROP POLICY IF EXISTS "Users can create companies" ON public.companies;
        DROP POLICY IF EXISTS "Company owners can update companies" ON public.companies;
        DROP POLICY IF EXISTS "Company owners can delete companies" ON public.companies;

        CREATE POLICY "Anyone can view active companies" ON public.companies
          FOR SELECT USING (status = 'active');

        CREATE POLICY "Users can create companies" ON public.companies
          FOR INSERT WITH CHECK (auth.uid() = created_by);

        CREATE POLICY "Company owners can update companies" ON public.companies
          FOR UPDATE USING (
            auth.uid() = created_by
            OR EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = companies.id
                AND cm.user_id = auth.uid()
                AND cm.role IN ('admin','editor')
            )
          );

        CREATE POLICY "Company owners can delete companies" ON public.companies
          FOR DELETE USING (
            auth.uid() = created_by
            OR EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = companies.id
                AND cm.user_id = auth.uid()
                AND cm.role = 'admin'
            )
          );

        DROP POLICY IF EXISTS "Anyone can view company members" ON public.company_members;
        DROP POLICY IF EXISTS "Company admins can manage members" ON public.company_members;
        DROP POLICY IF EXISTS "Users can join their own company" ON public.company_members;

        CREATE POLICY "Anyone can view company members" ON public.company_members
          FOR SELECT USING (true);

        CREATE POLICY "Company admins can add members" ON public.company_members
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = company_members.company_id
                AND cm.user_id = auth.uid()
                AND cm.role = 'admin'
            )
            OR EXISTS (
              SELECT 1 FROM public.companies c
              WHERE c.id = company_members.company_id
                AND c.created_by = auth.uid()
            )
          );

        CREATE POLICY "Company admins can update members" ON public.company_members
          FOR UPDATE USING (
            EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = company_members.company_id
                AND cm.user_id = auth.uid()
                AND cm.role = 'admin'
            )
            OR EXISTS (
              SELECT 1 FROM public.companies c
              WHERE c.id = company_members.company_id
                AND c.created_by = auth.uid()
            )
          );

        CREATE POLICY "Company admins can delete members" ON public.company_members
          FOR DELETE USING (
            EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = company_members.company_id
                AND cm.user_id = auth.uid()
                AND cm.role = 'admin'
            )
            OR EXISTS (
              SELECT 1 FROM public.companies c
              WHERE c.id = company_members.company_id
                AND c.created_by = auth.uid()
            )
          );
    END IF;
END $$;

-- Add company_id column to posts table (only if posts table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posts') THEN
        ALTER TABLE public.posts
        ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_posts_company_id ON public.posts(company_id) WHERE company_id IS NOT NULL;

        -- Update posts RLS to allow posting as company via membership
        DROP POLICY IF EXISTS "Users can create their own posts" ON public.posts;
        DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
        DROP POLICY IF EXISTS "Los usuarios autenticados pueden crear posts" ON public.posts;

        CREATE POLICY "Users can create posts (profile/group/company)" ON public.posts
          FOR INSERT WITH CHECK (
            auth.uid() = user_id
            AND (
              group_id IS NULL
              OR EXISTS (
                SELECT 1 FROM public.group_members gm
                WHERE gm.group_id = posts.group_id
                  AND gm.user_id = auth.uid()
              )
            )
            AND (
              company_id IS NULL
              OR EXISTS (
                SELECT 1 FROM public.company_members cm
                WHERE cm.company_id = posts.company_id
                  AND cm.user_id = auth.uid()
                  AND cm.role IN ('admin','editor')
              )
            )
          );

        DROP POLICY IF EXISTS "Users can view public posts and their own" ON public.posts;
        DROP POLICY IF EXISTS "View public and own posts" ON public.posts;
        DROP POLICY IF EXISTS "Los usuarios pueden ver posts públicos y los suyos" ON public.posts;

        CREATE POLICY "Users can view public posts, their own, group posts, and company posts" ON public.posts
          FOR SELECT USING (
            visibility = 'public'::post_visibility
            OR user_id = auth.uid()
            OR (group_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.group_members gm
              WHERE gm.group_id = posts.group_id
                AND gm.user_id = auth.uid()
            ))
            OR (company_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM public.company_members cm
              WHERE cm.company_id = posts.company_id
                AND cm.user_id = auth.uid()
            ))
          );

        DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
        DROP POLICY IF EXISTS "Users delete own posts" ON public.posts;
        DROP POLICY IF EXISTS "Los usuarios pueden eliminar sus propios posts" ON public.posts;

        CREATE POLICY "Users can delete own posts and company admins can delete company posts" ON public.posts
          FOR DELETE USING (
            auth.uid() = user_id
            OR (
              company_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM public.company_members cm
                WHERE cm.company_id = posts.company_id
                  AND cm.user_id = auth.uid()
                  AND cm.role = 'admin'
              )
            )
          );

        DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
        DROP POLICY IF EXISTS "Users update own posts" ON public.posts;
        DROP POLICY IF EXISTS "Users can update posts" ON public.posts;

        CREATE POLICY "Users can update own posts and company editors can update company posts" ON public.posts
          FOR UPDATE USING (
            auth.uid() = user_id
            OR (
              company_id IS NOT NULL
              AND EXISTS (
                SELECT 1 FROM public.company_members cm
                WHERE cm.company_id = posts.company_id
                  AND cm.user_id = auth.uid()
                  AND cm.role IN ('admin','editor')
              )
            )
          );
    END IF;
END $$;
