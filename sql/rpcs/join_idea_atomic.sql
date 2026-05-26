-- join_idea_atomic.sql
-- Inserta un registro en idea_participants y en notifications en la misma transacción.
-- Devuelve participant_id y notification_id

CREATE OR REPLACE FUNCTION public.join_idea_atomic(
  p_user_id uuid,
  p_post_id uuid,
  p_profession text DEFAULT NULL,
  p_message text DEFAULT NULL
) RETURNS TABLE(participant_id uuid, notification_id uuid) AS $$
DECLARE
  v_participant_id uuid;
  v_notification_id uuid;
  v_receiver uuid;
  v_username text;
BEGIN
  -- Insert participation
  INSERT INTO idea_participants(user_id, post_id, profession, status, joined_at)
  VALUES (p_user_id, p_post_id, COALESCE(p_profession, 'No especificado'), 'pending', now())
  RETURNING id INTO v_participant_id;

  -- Determine receiver (post owner) and username
  SELECT user_id INTO v_receiver FROM posts WHERE id = p_post_id;
  SELECT username INTO v_username FROM profiles WHERE id = p_user_id;

  IF v_receiver IS NOT NULL AND v_receiver <> p_user_id THEN
    INSERT INTO notifications(receiver_id, sender_id, type, post_id, message, created_at)
    VALUES (
      v_receiver,
      p_user_id,
      'join_request',
      p_post_id,
      COALESCE(p_message, format('%s solicitó unirse a tu idea', COALESCE(v_username,'Usuario'))),
      now()
    ) RETURNING id INTO v_notification_id;
  END IF;

  RETURN QUERY SELECT v_participant_id, v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
