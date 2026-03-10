-- Add missing post_metadata column used across the app
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS post_metadata JSONB;
