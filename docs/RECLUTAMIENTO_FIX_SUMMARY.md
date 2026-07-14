# Corrección del Bug Crítico en Flujo de Reclutamiento de HIDEON

## Problema Identificado

El flujo de reclutamiento tenía los siguientes problemas:
1. Los usuarios se unían automáticamente a las ideas sin aprobación del creador
2. El creador no recibía notificaciones de solicitudes de unión
3. El creador no podía visualizar ni gestionar solicitudes pendientes
4. La tabla `idea_participants` no tenía un campo de estado para controlar el flujo de aprobación

## Cambios Realizados

### 1. Migración SQL (Supabase)
**Archivo**: `supabase/migrations/20260522000000_add_status_to_idea_participants.sql`

- Agregó campo `status` a la tabla `idea_participants` con valores: 'pending', 'approved', 'rejected'
- Actualizó registros existentes a 'approved' (para mantener compatibilidad)
- Creó índice para mejor rendimiento en consultas por status
- Actualizó políticas RLS para permitir al creador gestionar solicitudes

**⚠️ IMPORTANTE**: Debes ejecutar esta migración en tu panel de Supabase:
1. Ve al panel de Supabase → SQL Editor
2. Copia y ejecuta el contenido del archivo de migración
3. Verifica que la tabla `idea_participants` ahora tiene el campo `status`

### 2. Hook de Unión a Ideas
**Archivo**: `src/hooks/post-mutations/idea-join/use-idea-join-mutation.ts`

- Modificó la inserción para incluir `status: "pending"` (línea 77)
- Actualizó mensaje de toast para indicar que es una solicitud pendiente de aprobación

### 3. Sistema de Notificaciones
**Archivo**: `src/hooks/post-mutations/idea-join/notifications.ts`

- Cambió tipo de notificación de `"idea_join"` a `"join_request"` (línea 34)
- Actualizó mensaje para reflejar que es una solicitud: "solicitó unirse a tu idea" (línea 36)

### 4. Hook de Listado de Participantes
**Archivo**: `src/hooks/ideas/use-idea-participants.ts`

- Agregó campo `status` a la interfaz `IdeaParticipant`
- Agregó parámetro `statusFilter` para filtrar por estado ('pending', 'approved', 'rejected', 'all')
- Actualizó query para seleccionar el campo `status`

### 5. Hook de Aprobación/Rechazo (NUEVO)
**Archivo**: `src/hooks/post-mutations/idea-join/use-idea-approval-mutation.ts`

- Creó nuevo hook con funciones:
  - `approveParticipant(userId)`: Aprueba una solicitud pendiente
  - `rejectParticipant(userId)`: Rechaza una solicitud pendiente
- Incluye manejo de errores y actualización de queries

### 6. Página de Participantes
**Archivo**: `src/pages/IdeaParticipants.tsx`

- Agregó verificación si el usuario actual es el creador de la idea
- Actualizó query para incluir campo `status`
- Muestra badges de estado (✓ Aprobado, ✗ Rechazado, ⏳ Pendiente)
- Agregó botones de aprobación/rechazo para el creador (solo para solicitudes pendientes)
- Integró hook `useIdeaApprovalMutation` para gestionar aprobaciones

### 7. Tipos TypeScript
**Archivo**: `src/types/post.ts`

- Agregó campo `status?: 'pending' | 'approved' | 'rejected'` a la interfaz `IdeaParticipant`

## Flujo de Trabajo Ahora Funcional

### Para Usuarios que Desean Unirse:
1. Usuario hace clic en "Unirse a idea"
2. Se crea registro en `idea_participants` con `status: "pending"`
3. Se envía notificación tipo `"join_request"` al creador
4. Usuario ve mensaje: "¡Solicitud enviada! Espera la aprobación del creador"

### Para Creadores de Ideas:
1. Creador recibe notificación: "Usuario solicitó unirse a tu idea"
2. Creador puede ver lista de participantes con sus estados
3. Para solicitudes pendientes, creador tiene botones:
   - ✓ (Aprobar): Cambia status a "approved"
   - ✗ (Rechazar): Cambia status a "rejected"
4. Solo participantes con status "approved" se consideran miembros activos

## Pruebas Recomendadas

1. **Prueba de unión**: Usuario se une a una idea y verifica que status sea "pending"
2. **Prueba de notificación**: Creador recibe notificación de solicitud
3. **Prueba de aprobación**: Creador aprueba solicitud y status cambia a "approved"
4. **Prueba de rechazo**: Creador rechaza solicitud y status cambia a "rejected"
5. **Prueba de filtrado**: Verificar que `useIdeaParticipants` filtra correctamente por status

## Archivos Modificados/Creados

- ✅ `supabase/migrations/20260522000000_add_status_to_idea_participants.sql` (NUEVO)
- ✅ `src/hooks/post-mutations/idea-join/use-idea-join-mutation.ts` (MODIFICADO)
- ✅ `src/hooks/post-mutations/idea-join/notifications.ts` (MODIFICADO)
- ✅ `src/hooks/ideas/use-idea-participants.ts` (MODIFICADO)
- ✅ `src/hooks/post-mutations/idea-join/use-idea-approval-mutation.ts` (NUEVO)
- ✅ `src/pages/IdeaParticipants.tsx` (MODIFICADO)
- ✅ `src/types/post.ts` (MODIFICADO)

## Pasos Siguientes

1. **Ejecutar migración SQL** en Supabase (CRÍTICO)
2. **Probar el flujo completo** en el entorno de desarrollo
3. **Verificar políticas RLS** en Supabase para asegurar que el creador pueda gestionar solicitudes
4. **Considerar agregar trigger** en Supabase para enviar notificación de aprobación/rechazo al solicitante
