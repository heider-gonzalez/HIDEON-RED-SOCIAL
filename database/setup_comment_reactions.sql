-- Verificar si existe tabla para reacciones de comentarios
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%comment%' OR table_name LIKE '%reaction%')
ORDER BY table_name;

-- Si no existe, crear tabla para reacciones de comentarios
CREATE TABLE IF NOT EXISTS comment_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('love', 'awesome', 'incredible', 'funny', 'surprised')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(comment_id, user_id) -- Un usuario solo puede reaccionar una vez por comentario
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment_id ON comment_reactions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_user_id ON comment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_created_at ON comment_reactions(created_at);

-- Verificar si la tabla comments tiene columnas para reacciones
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'comments' 
AND table_schema = 'public'
ORDER BY ordinal_position;
