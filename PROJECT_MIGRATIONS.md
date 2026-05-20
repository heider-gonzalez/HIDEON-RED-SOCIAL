# Migraciones de Mejora del Sistema de Proyectos

## Problema Detectado
El sistema de proyectos no tenía una entidad separada. Los proyectos eran solo posts con un cambio de estado en la columna `project_status`. Esto limitaba la funcionalidad y no permitía campos específicos de proyectos.

## Solución Implementada
Se han creado 4 migraciones para mejorar el sistema:

### 1. Crear tabla projects separada
**Archivo:** `supabase/migrations/20260519000000_create_projects_table.sql`

Esta migración crea una tabla `projects` separada con:
- `id`: UUID primary key
- `idea_id`: Foreign key a posts
- `name`: Nombre del proyecto
- `description`: Descripción del proyecto
- `owner_id`: Dueño del proyecto
- `status`: Estado del proyecto (planning, in_progress, completed, on_hold)
- `created_at`, `updated_at`: Timestamps

### 2. Actualizar función convert_idea_to_project
**Archivo:** `supabase/migrations/20260519010000_update_convert_idea_to_project.sql`

Esta migración actualiza la función RPC `convert_idea_to_project` para:
- Crear una entidad de proyecto real en la tabla `projects`
- Extraer nombre y descripción del JSON de la idea
- Migrar el chat de idea a proyecto (actualizar `idea_channels.project_id`)
- Retornar el `project_id` creado

### 3. Agregar project_id a idea_channels
**Archivo:** `supabase/migrations/20260519020000_add_project_id_to_idea_channels.sql`

Esta migración:
- Agrega columna `project_id` a la tabla `idea_channels`
- Permite vincular canales de chat a proyectos
- Actualiza políticas RLS para lectura por project_id

### 4. Agregar constraint único en idea_participants
**Archivo:** `supabase/migrations/20260519030000_add_unique_constraint_idea_participants.sql`

Esta migración:
- Elimina registros duplicados en `idea_participants`
- Agrega constraint único `(user_id, post_id)`
- Previene que un usuario se una a la misma idea múltiples veces

## Instrucciones para Ejecución Manual

Debido a problemas de sincronización con el CLI de Supabase, estas migraciones deben ejecutarse manualmente en el SQL Editor de Supabase:

1. Ir a https://supabase.com/dashboard/project/wgbbaxvuuinubkgffpiq/sql
2. Ejecutar cada migración en orden:
   - Primero: `20260519000000_create_projects_table.sql`
   - Segundo: `20260519010000_update_convert_idea_to_project.sql`
   - Tercero: `20260519020000_add_project_id_to_idea_channels.sql`
   - Cuarto: `20260519030000_add_unique_constraint_idea_participants.sql`

## Cambios en TypeScript

Se ha creado el archivo `src/types/database/projects.types.ts` con los tipos TypeScript para la nueva tabla projects.

## Beneficios de la Mejora

1. **Proyectos como entidades separadas**: Ahora los proyectos tienen su propia tabla con campos específicos
2. **Chat vinculado a proyectos**: El chat se migra automáticamente cuando una idea se convierte en proyecto
3. **Prevención de duplicados**: Constraint único evita joins duplicados
4. **Escalabilidad**: Permite agregar más campos específicos de proyectos en el futuro
5. **Mejor organización**: Separación clara entre ideas y proyectos

## Pruebas Recomendadas

1. Crear una idea nueva
2. Unirse a la idea como participante
3. Convertir la idea a proyecto
4. Verificar que se cree un registro en la tabla `projects`
5. Verificar que el chat se vincule al proyecto
6. Intentar unirse a la misma idea dos veces (debería fallar)
