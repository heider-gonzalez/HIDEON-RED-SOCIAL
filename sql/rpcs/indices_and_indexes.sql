-- indices_and_indexes.sql
-- Índices recomendados para acelerar consultas relacionadas con ideas y notificaciones

CREATE INDEX IF NOT EXISTS idx_idea_participants_post_id ON idea_participants(post_id);
CREATE INDEX IF NOT EXISTS idx_idea_participants_user_id ON idea_participants(user_id);
-- 'notifications' table uses column `read` (boolean) for read status
CREATE INDEX IF NOT EXISTS idx_notifications_receiver_read ON notifications(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
