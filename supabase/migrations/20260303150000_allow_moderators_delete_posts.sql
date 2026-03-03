-- Allow moderators/admins to delete any post (RLS)

-- Extend existing posts DELETE policy to include moderator/admin roles
DROP POLICY IF EXISTS "Users can delete own posts and company admins can delete company posts" ON public.posts;

CREATE POLICY "Users can delete own posts and company admins can delete company posts" ON public.posts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role('moderator'::public.app_role, (SELECT auth.uid()::text))
    OR public.has_role('admin'::public.app_role, (SELECT auth.uid()::text))
    OR (
      company_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.company_members cm
        WHERE cm.company_id = posts.company_id
          AND cm.user_id = auth.uid()
          AND cm.role = 'admin'
      )
    )
  );
