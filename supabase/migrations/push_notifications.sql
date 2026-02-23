-- Create push_subscriptions table if it doesn't exist
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id) -- One subscription per user
);

-- Enable Row Level Security on push_subscriptions table
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for push_subscriptions
DROP POLICY IF EXISTS "Users can view own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- NOTE: pg_net extension may not be available in all Supabase plans
-- Uncomment the following line only if pg_net is enabled in your project
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- Alternative implementation: Store notifications for processing
-- This approach stores notifications in a table and processes them separately

-- Create notifications queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'message', 'friend_request', etc.
  recipient_ids UUID[] NOT NULL, -- Array of user IDs to notify
  payload JSONB NOT NULL, -- Notification data
  status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Function to queue notifications (works without pg_net)
CREATE OR REPLACE FUNCTION queue_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_ids UUID[];
  message_author_id UUID;
BEGIN
  -- Get message author
  message_author_id := NEW.id_autor;

  -- Get all channel members except the author
  SELECT array_agg(id_usuario)
  INTO recipient_ids
  FROM miembros_canal
  WHERE id_canal = NEW.id_canal
    AND id_usuario != message_author_id;

  -- Only queue if there are recipients
  IF recipient_ids IS NOT NULL AND array_length(recipient_ids, 1) > 0 THEN
    -- Get message author info
    INSERT INTO notification_queue (type, recipient_ids, payload)
    SELECT
      'message',
      recipient_ids,
      jsonb_build_object(
        'messageId', NEW.id,
        'channelId', NEW.id_canal,
        'content', NEW.contenido,
        'authorId', message_author_id,
        'timestamp', NEW.created_at
      );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger using the queue approach
DROP TRIGGER IF EXISTS queue_push_notification_trigger ON mensajes;
CREATE TRIGGER queue_push_notification_trigger
  AFTER INSERT ON mensajes
  FOR EACH ROW
  EXECUTE FUNCTION queue_push_notification();

-- Alternative: Direct Edge Function call (if pg_net is available)
-- Uncomment and modify the following if pg_net is enabled:

-- Enable pg_net extension for HTTP calls
-- CREATE EXTENSION IF NOT EXISTS pg_net;

-- CREATE OR REPLACE FUNCTION send_push_notification()
-- RETURNS TRIGGER AS $$
-- DECLARE
--   notification_payload JSONB;
-- BEGIN
--   notification_payload := jsonb_build_object('record', row_to_json(NEW)::jsonb);
--
--   PERFORM net.http_post(
--     url := 'YOUR_EDGE_FUNCTION_URL',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
--     ),
--     body := notification_payload
--   );
--
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- DROP TRIGGER IF EXISTS send_push_notification_trigger ON mensajes;
-- CREATE TRIGGER send_push_notification_trigger
--   AFTER INSERT ON mensajes
--   FOR EACH ROW
--   EXECUTE FUNCTION send_push_notification();
