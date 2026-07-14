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
# Desplegar todas las funciones
supabase functions deploy send-push-notification
supabase functions deploy process-notifications
supabase functions deploy cleanup-notifications  # Nueva función de limpieza
```

## ⚡ **Procesamiento Automático Inteligente**

### **Características del Procesador**
- **Intervalo inteligente**: 30 segundos base, con backoff exponencial
- **Procesamiento en lotes**: 10 notificaciones por vez
- **Reintentos automáticos**: Hasta 3 reintentos con multiplicador x2
- **Prevención de sobrecarga**: Backoff hasta 5 minutos máximo
- **Detección de éxito**: Si procesa items, reintenta en 5 segundos

### **Limpieza Automática**
- **Frecuencia**: Cada 6 horas automáticamente
- **Políticas de limpieza**:
  - ✅ **Procesadas**: > 24 horas → Eliminar
  - ✅ **Fallidas**: > 7 días → Eliminar
  - ✅ **Pendientes atascadas**: > 24 horas → Eliminar
- **Ejecución inicial**: Al cargar la app por primera vez

## 🔧 **Configuración Adicional**

### **Variables de Entorno**
```bash
# En .env.local
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key
```

### **Personalización de Intervalos**
```javascript
// En ServiceWorkerRegistration component
const { triggerProcessing } = useNotificationQueue({
  interval: 60000, // 1 minuto (personalizar)
  batchSize: 5,    // 5 notificaciones por lote
  maxRetries: 5,   // Más reintentos
  backoffMultiplier: 1.5 // Backoff más suave
});
```

## 📊 **Monitoreo y Debugging**

### **Logs en Consola** (Desarrollo)
```javascript
// Procesamiento de cola
🔔 Queue processor status: {
  isProcessing: false,
  currentInterval: 30,
  userId: "user-123"
}

// Limpieza automática
🧹 Running periodic notification cleanup...
🧹 Cleanup result: { cleaned: { processed: 15, failed: 2, pending: 0 } }
```

### **Verificación de Funcionamiento**
```bash
# Probar procesamiento manual
curl -X POST "https://tu-proyecto.supabase.co/functions/v1/process-notifications" \
  -H "Authorization: Bearer tu-anon-key"

# Probar limpieza manual
curl -X POST "https://tu-proyecto.supabase.co/functions/v1/cleanup-notifications" \
  -H "Authorization: Bearer tu-anon-key" \
  -d '{"dryRun": true}'
```

## 🎯 **Sistema Nivel Dios - Características Finales**

### **Automatización Completa**
- ✅ **Envío automático**: Trigger en BD → Cola → Procesamiento automático
- ✅ **Limpieza automática**: Eliminación de registros antiguos cada 6 horas
- ✅ **Recuperación inteligente**: Reintentos y backoff automático
- ✅ **Escalabilidad**: Procesamiento en lotes sin sobrecargar
- ✅ **Confiabilidad**: Sistema queue-based resistente a fallos

### **Arquitectura Optimizada**
- 🔄 **Queue-based**: No bloquea operaciones críticas
- ⚡ **Batch processing**: Eficiencia máxima
- 🧹 **Auto-cleanup**: Base de datos siempre optimizada
- 🔄 **Self-healing**: Recuperación automática de errores
- 📊 **Observable**: Logging completo para debugging

¡El sistema ahora es completamente autónomo y se mantiene solo! 🚀

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
