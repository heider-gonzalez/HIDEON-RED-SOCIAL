-- Migración correcta para actualizar reacciones antiguas a nuevos valores
-- Basado en el schema real: tabla reactions con columnas id, post_id, user_id, reaction_type, created_at

-- Actualizar todos los tipos de reacción antiguos a los nuevos valores
UPDATE reactions 
SET reaction_type = CASE 
    -- Mantener love como "Me gusta" (corazón ❤️)
    WHEN reaction_type = 'me_gusta' THEN 'love'
    WHEN reaction_type = 'megusta' THEN 'love'
    WHEN reaction_type = 'like' THEN 'love'
    WHEN reaction_type = 'gusta' THEN 'love'
    
    -- Mantener awesome como "Buena idea" (bombilla 💡)
    WHEN reaction_type = 'interesante' THEN 'awesome'
    WHEN reaction_type = 'idea' THEN 'awesome'
    WHEN reaction_type = 'buena_idea' THEN 'awesome'
    WHEN reaction_type = 'buen_idea' THEN 'awesome'
    WHEN reaction_type = 'bombilla' THEN 'awesome'
    
    -- Mantener incredible como "Colaborar" (mano 🤝)
    WHEN reaction_type = 'apoyo' THEN 'incredible'
    WHEN reaction_type = 'apoyar' THEN 'incredible'
    WHEN reaction_type = 'colaborar' THEN 'incredible'
    WHEN reaction_type = 'teamwork' THEN 'incredible'
    
    -- Mantener funny como "XD" (carita feliz 😆)
    WHEN reaction_type = 'divertido' THEN 'funny'
    WHEN reaction_type = 'xd' THEN 'funny'
    WHEN reaction_type = 'risa' THEN 'funny'
    WHEN reaction_type = 'reir' THEN 'funny'
    WHEN reaction_type = 'celebrar' THEN 'funny'
    
    -- Mantener surprised como "Genio" (estrella 🤯)
    WHEN reaction_type = 'util' THEN 'surprised'
    WHEN reaction_type = 'útil' THEN 'surprised'
    WHEN reaction_type = 'genio' THEN 'surprised'
    WHEN reaction_type = 'asombro' THEN 'surprised'
    WHEN reaction_type = 'wow' THEN 'surprised'
    
    ELSE reaction_type
END
WHERE reaction_type IN (
    'me_gusta', 'megusta', 'like', 'gusta',
    'interesante', 'idea', 'buena_idea', 'buen_idea', 'bombilla',
    'apoyo', 'apoyar', 'colaborar', 'teamwork',
    'divertido', 'xd', 'risa', 'reir', 'celebrar',
    'util', 'útil', 'genio', 'asombro', 'wow'
);

-- Verificar cuántas reacciones se actualizaron
SELECT 
    reaction_type,
    COUNT(*) as count
FROM reactions 
GROUP BY reaction_type 
ORDER BY count DESC;

SELECT 'Migración completada: ❤️ Me gusta, 💡 Buena idea, 🤝 Colaborar, 😆 XD, 🤯 Genio' as status;
