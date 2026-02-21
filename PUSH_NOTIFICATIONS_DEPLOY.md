# 🚀 Deploy Edge Function para Push Notifications

## Cambios Importantes
Debido a que `pg_net` no está disponible en todos los planes de Supabase, implementamos un sistema basado en **cola de notificaciones** que es más confiable y escalable.

## 1. Ejecutar Migración de Base de Datos
```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: supabase/migrations/push_notifications.sql
```
Esta migración crea:
- Tabla `push_subscriptions` para almacenar subscriptions
- Tabla `notification_queue` para cola de notificaciones
- Trigger que automáticamente encola notificaciones al insertar mensajes

## 2. Desplegar Edge Functions
```bash
# Desplegar la función original (para notificaciones individuales)
supabase functions deploy send-push-notification

# Desplegar la nueva función de procesamiento de cola
supabase functions deploy process-notifications
```

## 3. Configurar Secrets (Opcional)
```bash
# Si usas FCM u otro servicio de push
supabase secrets set FCM_SERVER_KEY=tu_fcm_server_key

# VAPID keys (para Web Push API nativo)
supabase secrets set VAPID_PRIVATE_KEY=tu_private_key
supabase secrets set VAPID_EMAIL=tu_email@dominio.com
```

## 4. Configurar Frontend
```bash
# En .env.local
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key_generada
```

## 5. Probar el Sistema

### Opción A: Procesamiento Manual
```bash
# Probar enviando una notificación
curl -X POST "https://tu-proyecto.supabase.co/functions/v1/process-notifications" \
  -H "Authorization: Bearer tu-anon-key"
```

### Opción B: Procesamiento Automático (Recomendado)
Configurar un **cron job** o **scheduled function** para procesar la cola cada minuto:

```javascript
// En tu aplicación frontend, llamar periódicamente
setInterval(async () => {
  try {
    const response = await fetch('/functions/v1/process-notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`
      }
    });
    const result = await response.json();
    console.log('Processed notifications:', result);
  } catch (error) {
    console.error('Error processing notifications:', error);
  }
}, 60000); // Cada minuto
```

## 📋 Checklist de Verificación
- [ ] Migración ejecutada sin errores
- [ ] Tablas `push_subscriptions` y `notification_queue` creadas
- [ ] Trigger funcionando (verifica inserts en notification_queue)
- [ ] Edge Functions desplegadas
- [ ] Frontend configurado con VAPID keys
- [ ] Procesamiento de cola funcionando
- [ ] Notificaciones llegan en tiempo real

## 🔧 Solución de Problemas
- **Trigger no funciona**: Verificar que las tablas existen y el trigger está creado
- **Edge Function falla**: Revisar logs en Supabase Dashboard
- **Notificaciones no llegan**: Verificar subscriptions guardadas correctamente
- **VAPID keys**: Asegurarse de que coincidan entre frontend y backend

## 🎯 Beneficios del Sistema Queue-Based
- ✅ **No depende de pg_net**: Compatible con todos los planes de Supabase
- ✅ **Escalable**: Puede procesar notificaciones en lotes
- ✅ **Confiable**: No bloquea inserts de mensajes si el envío falla
- ✅ **Debuggable**: Fácil ver qué notificaciones están pendientes/fallidas
- ✅ **Offline-ready**: Funciona incluso si el servicio de push está caído
