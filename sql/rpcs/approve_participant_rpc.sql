-- approve_participant_rpc.sql
-- Aprueba a un participante, crea notificación y llama a get_or_create_idea_channel

CREATE OR REPLACE FUNCTION public.approve_participant_rpc(
  p_post_id uuid,
  p_participant_user_id uuid
) RETURNS TABLE(channel_id uuid) AS $$
DECLARE
  v_channel uuid;
  v_creator uuid;
  v_notification_id uuid;
BEGIN
  -- Update status
  UPDATE idea_participants
  SET status = 'approved', decided_at = now()
  WHERE post_id = p_post_id AND user_id = p_participant_user_id;

  -- get creator
  SELECT user_id INTO v_creator FROM posts WHERE id = p_post_id;

  IF v_creator IS NOT NULL THEN
    INSERT INTO notifications(receiver_id, sender_id, type, post_id, message, created_at)
    VALUES (
      p_participant_user_id,
      v_creator,
      'idea_accepted',
      p_post_id,
      'Tu solicitud fue aceptada',
      now()
    ) RETURNING id INTO v_notification_id;
  END IF;

  -- Attempt to call existing RPC to get/create channel. Adapt depending on your RPC signature.
  BEGIN
    -- Call the RPC with the correct signature (p_post_id) which returns uuid
    v_channel := get_or_create_idea_channel(p_post_id);
  EXCEPTION WHEN others THEN
    RAISE NOTICE 'get_or_create_idea_channel failed: %', SQLERRM;
    v_channel := NULL;
  END;

  IF v_channel IS NOT NULL THEN
    RETURN QUERY SELECT v_channel;
  ELSE
    RETURN QUERY SELECT NULL::uuid;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
