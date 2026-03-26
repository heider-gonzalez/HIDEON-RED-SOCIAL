# Migración de Videos: R2 → Supabase

Este directorio contiene scripts para migrar videos desde Cloudflare R2 a Supabase Storage.

## 🚀 Pasos para la Migración

### 1. Instalar Dependencias
```bash
cd scripts
npm install
```

### 2. Configurar Variables de Entorno

Asegúrate de tener estas variables en tu `.env`:

```env
# Supabase
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Cloudflare R2
VITE_R2_ACCOUNT_ID=tu_account_id
VITE_R2_ACCESS_KEY_ID=tu_access_key
VITE_R2_SECRET_ACCESS_KEY=tu_secret_key
VITE_R2_BUCKET_NAME=pub-11aaf71a35c74d7da48843fdfc2c1e44
```

### 3. Ejecutar Migración Completa

```bash
# Opción 1: Migración completa (recomendado)
npm run full-migration

# Opción 2: Paso a paso
npm run migrate      # Migrar archivos de R2 a Supabase
npm run update-urls # Actualizar URLs en la base de datos
```

## 📋 ¿Qué hacen los scripts?

### migrate-r2-to-supabase.js
- Lista todos los videos en el bucket R2
- Descarga cada video de R2
- Sube los videos a Supabase Storage
- Muestra progreso y estadísticas

### update-video-urls.js
- Busca todos los posts con media_url/media_urls
- Reemplaza URLs de R2 con URLs de Supabase
- Actualiza la base de datos
- Verifica los cambios

## ⚠️ Notas Importantes

1. **Backup**: Haz un backup de tu base de datos antes de ejecutar
2. **Tiempo**: La migración puede tardar dependiendo de la cantidad de videos
3. **Espacio**: Asegúrate de tener suficiente espacio en Supabase Storage
4. **Permisos**: Usa el Service Role Key de Supabase para permisos completos

## 🔍 Verificación

Después de la migración:

1. Los videos deberían cargar desde URLs de Supabase
2. Las URLs en la base de datos apuntarán a Supabase
3. Los videos existentes en R2 pueden eliminarse (después de verificar)

## 🚨 En caso de Error

- Revisa las variables de entorno
- Verifica conexión a R2 y Supabase
- Revisa permisos del bucket de Supabase
- Revisa espacio disponible en Supabase Storage
