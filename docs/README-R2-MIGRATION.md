# Migrar de Supabase Storage a Cloudflare R2 (reducir egreso)

## 1. Configurar variables de entorno

Añade estas variables a tu `.env` local y a Render:

```bash
# Cloudflare R2
CLOUDFLARE_R2_API_URL=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=...
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
CLOUDFLARE_R2_BUCKET_NAME=hideon-media
VITE_R2_PUBLIC_URL=https://pub-<hash>.r2.dev

# Opcional: deshabilitar fallback a Supabase Storage
VITE_DISABLE_SUPABASE_FALLBACK=true
```

## 2. Instalar dependencias

```bash
npm install @aws-sdk/client-s3 @supabase/supabase-js
```

## 3. Migrar archivos de Supabase a R2

```bash
# Asegúrate de tener las variables de entorno configuradas
node scripts/migrate-supabase-to-r2.js
```

Este script migra:
- `media/` (posts)
- `post-audio/` (música)
- `profiles/` (avatares/covers)

## 4. Verificar migración

```bash
node scripts/verify-r2-migration.js
```

## 5. Actualizar URLs en la base de datos

```bash
node scripts/update-db-urls-to-r2.js
```

Este script reemplaza todas las URLs de Supabase Storage por URLs de R2 en:
- `posts.media_url` y `posts.media_urls`
- `profiles.avatar_url`, `profiles.cover_url`, `profiles.intro_audio_url`

## 6. Deploy y pruebas

1) Commit y push de los cambios.
2) Redespliega en Render con las nuevas variables de entorno.
3) Verifica que las imágenes y audios carguen desde `pub-*.r2.dev`.
4) Opcional: elimina los buckets de Supabase Storage para evitar costos.

## 7. Monitoreo

En Cloudflare Dashboard > R2 > Analytics, monitorea el uso y egreso. Con R2 no hay cargo por egreso a Internet.

---

### Notas importantes

- Los scripts usan `SUPABASE_SERVICE_ROLE_KEY` (permisos totales). Nunca exponer esta clave en el cliente.
- Si `VITE_DISABLE_SUPABASE_FALLBACK=true`, la app solo usará R2. Si no, fallback a Supabase si falla R2.
- Los archivos ya subidos a R2 son públicos a través de `VITE_R2_PUBLIC_URL`.
