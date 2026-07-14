# 🔔 Sistema de Notificaciones en Tiempo Real - ACTIVADO

## ✅ ¿Qué se implementó?

Tu red social ahora tiene **notificaciones en tiempo real** completamente funcionales:

### 📱 Notificaciones Automáticas para:
- ❤️ **Likes en posts** - Recibes notificación instantánea cuando alguien da like
- 💬 **Comentarios** - Notificación cuando comenten en tus posts
- 🔄 **Respuestas** - Cuando respondan a tus comentarios
- 📣 **Menciones** - Cuando te mencionen en un comentario (formato `@usuario`)

### ⚡ Características:
- **Tiempo real** - Las notificaciones aparecen al instante sin refrescar
- **Sin duplicados** - Sistema inteligente que evita notificaciones repetidas
- **Sonido** - Reproducción de sonido al recibir notificación
- **Toast popup** - Mensaje emergente con la notificación
- **Badge contador** - Muestra cuántas notificaciones no leídas tienes
- **Sistema de lectura** - Marca notificaciones como leídas automáticamente
- **Limpieza automática** - Elimina notificaciones de más de 30 días

---

## 🚀 Cómo Activar

### Paso 1: Ejecutar el SQL

1. Abre **Lovable Cloud** (tab superior)
2. Click en **SQL Editor**
3. Copia y pega el contenido del archivo: `sql/enable_realtime_notifications.sql`
4. Click en **Run** (▶️)

### Paso 2: Verificar

Las notificaciones ya funcionan automáticamente. Prueba:
1. Crear un post con otro usuario
2. Darle like → Deberías recibir notificación instantánea
3. Comentar → El autor del post recibe notificación
4. Mencionar a alguien con `@usuario` → Recibe notificación de mención

---

## 🎯 Cómo Funciona

### Backend (Automático)
```
Usuario da like → Trigger SQL → Crea notificación → Realtime broadcast
```

### Frontend (Ya implementado)
- `src/hooks/use-notifications.ts` - Maneja el estado de notificaciones
- `src/lib/notifications/subscribe-notifications.ts` - Escucha cambios en tiempo real
- `src/components/notifications/*` - Componentes UI

### Triggers SQL Activos:
1. **`trigger_notify_post_like`** - Se activa al insertar en `post_reactions`
2. **`trigger_notify_post_comment`** - Se activa al insertar en `comments`
3. **`trigger_notify_comment_mentions`** - Detecta menciones con regex

---

## 📊 Estructura de Datos

### Tabla `notifications`
```sql
- id: UUID
- type: TEXT (post_like, post_comment, comment_reply, mention, etc.)
- sender_id: UUID (quien genera la notificación)
- receiver_id: UUID (quien la recibe)
- post_id: UUID (opcional)
- comment_id: UUID (opcional)
- message: TEXT (opcional)
- read: BOOLEAN
- created_at: TIMESTAMP
```

---

## 🎨 Tipos de Notificaciones

| Tipo | Cuándo se genera | Ícono |
|------|-----------------|-------|
| `post_like` | Alguien da like a tu post | ❤️ |
| `post_comment` | Alguien comenta tu post | 💬 |
| `comment_reply` | Alguien responde tu comentario | 🔄 |
| `mention` | Alguien te menciona | 📣 |
| `friend_request` | Nueva solicitud de amistad | 👥 |
| `friend_accepted` | Solicitud aceptada | ✅ |

---

## 🔧 Configuración Avanzada

### Deshabilitar sonido
En `src/lib/notifications/subscribe-notifications.ts` línea ~101:
```typescript
// Comentar esta línea:
// const notificationSound = new Audio("/notification.mp3");
// notificationSound.play().catch(console.error);
```

### Cambiar tiempo de limpieza
Por defecto elimina notificaciones > 30 días. Para cambiar:
```sql
-- En el SQL, modificar:
DELETE FROM public.notifications 
WHERE created_at < now() - INTERVAL '30 days'; -- Cambiar '30 days'
```

### Agregar nuevos tipos
1. Agregar tipo en `src/types/notifications.ts`
2. Actualizar constraint en SQL: `ALTER TABLE notifications ...`
3. Crear trigger/función que lo genere

---

## 🐛 Troubleshooting

### Las notificaciones no aparecen:
1. Verifica que ejecutaste el SQL en Lovable Cloud
2. Comprueba en Cloud → Database que existe la tabla `notifications`
3. Ve a Cloud → Database → `notifications` → Realtime debe estar **ON**

### No hay sonido:
- Asegúrate de tener el archivo `public/notification.mp3`
- Los navegadores bloquean audio sin interacción del usuario primero

### Duplicados:
- El sistema previene duplicados en ventana de 5 minutos
- Para cambiar: modifica `INTERVAL '5 minutes'` en la función SQL

---

## 📈 Próximas Mejoras Posibles

- [ ] Agrupar notificaciones similares ("Juan y 5 más dieron like")
- [ ] Notificaciones push (PWA)
- [ ] Configuración de preferencias por tipo
- [ ] Resumen diario por email
- [ ] Marcar todas como leídas con un click
- [ ] Filtrar por tipo de notificación

---

## 💡 Tips de Uso

- El badge rojo muestra el número de notificaciones no leídas
- Toca una notificación para ir directamente al post/comentario
- Desliza a la izquierda (móvil) para eliminar una notificación
- Las notificaciones se marcan como leídas al hacer click

---

**¡El sistema está listo!** 🎉

Las notificaciones funcionarán automáticamente una vez ejecutes el SQL.
