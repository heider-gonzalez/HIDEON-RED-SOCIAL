-- Allow moderators/admins to delete any comment (RLS)

-- Extend existing comments DELETE policy to include moderator/admin roles
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;

CREATE POLICY "Users can delete own comments" ON public.comments
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role('moderator', (SELECT auth.uid()::text))
    OR public.has_role('admin', (SELECT auth.uid()::text))
  );
