  -- Allow moderators/admins (global) to delete any group

  -- Extend groups DELETE policy to include moderator/admin roles
  DROP POLICY IF EXISTS "Group creators and admins can delete groups" ON public.groups;

  CREATE POLICY "Group creators and admins can delete groups"
  ON public.groups
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1
      FROM public.group_members
      WHERE group_id = groups.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
    OR public.has_role('moderator', (SELECT auth.uid()::text))
    OR public.has_role('admin', (SELECT auth.uid()::text))
  );

  -- Update RPC delete_group to allow group admins OR global moderator/admin
  CREATE OR REPLACE FUNCTION public.delete_group(group_id_param uuid)
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
  AS $$
  DECLARE
    requester_role text;
    is_mod boolean;
    is_admin boolean;
  BEGIN
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Allow global moderators/admins and the moderation account
    SELECT public.has_role('moderator', (SELECT auth.uid()::text)) INTO is_mod;
    SELECT public.has_role('admin', (SELECT auth.uid()::text)) INTO is_admin;

    IF auth.uid()::text = 'a12b715b-588a-41eb-bc09-5739bb579894' OR is_mod OR is_admin THEN
      DELETE FROM public.groups WHERE id = group_id_param;
      RETURN jsonb_build_object('success', true);
    END IF;

    SELECT gm.role INTO requester_role
    FROM public.group_members gm
    WHERE gm.group_id = group_id_param AND gm.user_id = auth.uid();

    IF requester_role IS NULL OR requester_role <> 'admin' THEN
      RETURN jsonb_build_object('success', false, 'error', 'No autorizado');
    END IF;

    DELETE FROM public.groups WHERE id = group_id_param;

    RETURN jsonb_build_object('success', true);
  END;
  $$;
