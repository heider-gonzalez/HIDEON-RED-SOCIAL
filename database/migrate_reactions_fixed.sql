-- Migración para actualizar reacciones antiguas a nuevos valores
-- Basado en la imagen: ❤️ Me gusta, 💡 Buena idea, 🤝 Colaborar, 😆 XD, 🤯 Genio

-- Actualizar tabla de reacciones (si existe)
UPDATE reactions 
SET reaction_type = CASE 
    -- Mantener love como "Me gusta" (corazón)
    WHEN reaction_type = 'me_gusta' THEN 'love'
    WHEN reaction_type = 'megusta' THEN 'love'
    WHEN reaction_type = 'like' THEN 'love'
    WHEN reaction_type = 'gusta' THEN 'love'
    
    -- Mantener awesome como "Buena idea" (bombilla)
    WHEN reaction_type = 'interesante' THEN 'awesome'
    WHEN reaction_type = 'idea' THEN 'awesome'
    WHEN reaction_type = 'buena_idea' THEN 'awesome'
    WHEN reaction_type = 'buen_idea' THEN 'awesome'
    WHEN reaction_type = 'bombilla' THEN 'awesome'
    
    -- Mantener incredible como "Colaborar" (mano)
    WHEN reaction_type = 'apoyo' THEN 'incredible'
    WHEN reaction_type = 'apoyar' THEN 'incredible'
    WHEN reaction_type = 'colaborar' THEN 'incredible'
    WHEN reaction_type = 'teamwork' THEN 'incredible'
    
    -- Mantener funny como "XD" (carita feliz)
    WHEN reaction_type = 'divertido' THEN 'funny'
    WHEN reaction_type = 'xd' THEN 'funny'
    WHEN reaction_type = 'risa' THEN 'funny'
    WHEN reaction_type = 'reir' THEN 'funny'
    WHEN reaction_type = 'celebrar' THEN 'funny'
    
    -- Mantener surprised como "Genio" (estrella/explosión)
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

-- Si tienes reacciones guardadas en posts como JSON
UPDATE posts 
SET reactions_by_type = CASE 
    -- Convertir me_gusta a love (Me gusta ❤️)
    WHEN reactions_by_type ? 'me_gusta' THEN 
        jsonb_set(
            jsonb_set(reactions_by_type, '{love}', COALESCE(reactions_by_type->'me_gusta', '0')),
            '{me_gusta}',
            '0'
        )::jsonb
    -- Convertir interesante a awesome (Buena idea 💡)
    WHEN reactions_by_type ? 'interesante' THEN
        jsonb_set(
            jsonb_set(reactions_by_type, '{awesome}', COALESCE(reactions_by_type->'interesante', '0')),
            '{interesante}',
            '0'
        )::jsonb
    -- Convertir apoyo a incredible (Colaborar 🤝)
    WHEN reactions_by_type ? 'apoyo' THEN
        jsonb_set(
            jsonb_set(reactions_by_type, '{incredible}', COALESCE(reactions_by_type->'apoyo', '0')),
            '{apoyo}',
            '0'
        )::jsonb
    ELSE reactions_by_type
END
WHERE reactions_by_type IS NOT NULL AND (
    reactions_by_type ? 'me_gusta' OR 
    reactions_by_type ? 'interesante' OR 
    reactions_by_type ? 'apoyo'
);

-- Limpiar valores nulos o cero
UPDATE posts 
SET reactions_by_type = reactions_by_type - 'me_gusta' - 'interesante' - 'apoyo'
WHERE reactions_by_type IS NOT NULL;

SELECT 'Migración completada: ❤️ Me gusta, 💡 Buena idea, 🤝 Colaborar, 😆 XD, 🤯 Genio' as status;
