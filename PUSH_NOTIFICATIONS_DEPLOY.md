# 🚀 Deploy Edge Function para Push Notifications

## 1. Desplegar Edge Function
```bash
# Instalar Supabase CLI si no lo tienes
npm install -g supabase

# Login a Supabase
supabase login

# Desplegar la Edge Function
supabase functions deploy send-push-notification
```

## 2. Configurar Secrets en Supabase
```bash
# Configurar VAPID keys como secrets
supabase secrets set VAPID_PRIVATE_KEY=tu_private_key_generada
supabase secrets set VAPID_EMAIL=tu_email@dominio.com

# Para FCM (Firebase Cloud Messaging) si usas Google FCM
supabase secrets set FCM_SERVER_KEY=tu_fcm_server_key
```

## 3. Ejecutar Migración de Base de Datos
```sql
-- Ejecutar en Supabase SQL Editor o CLI
-- El archivo: supabase/migrations/push_notifications.sql
```

## 4. Configurar VAPID Keys en Frontend
```bash
# En tu .env.local
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key_generada

# Reiniciar el servidor de desarrollo
npm run dev
```

## 5. Probar el Sistema
1. Abrir la app en el navegador
2. Iniciar sesión
3. Enviar un mensaje desde otra pestaña/dispositivo
4. Deberías recibir una notificación push automáticamente

## 📋 Checklist de Verificación
- [ ] Edge Function desplegada correctamente
- [ ] Secrets configurados (VAPID keys)
- [ ] Migración de BD ejecutada
- [ ] Frontend configurado con VAPID public key
- [ ] Notificaciones llegan en tiempo real
- [ ] Funciona incluso con app cerrada

## 🔧 Solución de Problemas
- **Error 404 en Edge Function**: Verificar que esté desplegada
- **No llegan notificaciones**: Revisar VAPID keys y permisos del navegador
- **Error de CORS**: Verificar configuración de secrets
