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
CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically send push notifications
CREATE OR REPLACE FUNCTION send_push_notification()
RETURNS TRIGGER AS $$
DECLARE
  notification_payload JSONB;
BEGIN
  -- Prepare notification payload
  notification_payload := jsonb_build_object(
    'record', row_to_json(NEW)::jsonb
  );

  -- Call the Edge Function
  PERFORM
    net.http_post(
      url := (SELECT url FROM edge_functions WHERE name = 'send-push-notification'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'service_role_key')
      ),
      body := notification_payload
    );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on mensajes table
DROP TRIGGER IF EXISTS send_push_notification_trigger ON mensajes;
CREATE TRIGGER send_push_notification_trigger
  AFTER INSERT ON mensajes
  FOR EACH ROW
  EXECUTE FUNCTION send_push_notification();

-- Alternative: Use pg_net for HTTP calls (if net extension is available)
-- This requires the pg_net extension to be enabled

-- Grant necessary permissions
GRANT USAGE ON SCHEMA net TO postgres, service_role;
GRANT EXECUTE ON FUNCTION net.http_post TO postgres, service_role;
