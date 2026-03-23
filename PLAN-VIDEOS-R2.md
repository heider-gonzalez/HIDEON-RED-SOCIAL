# Plan: Videos funcionando con R2 (sin egreso de Supabase)

## Objetivo
Que los videos e imágenes carguen correctamente desde Cloudflare R2, eliminando el egreso (costos) de Supabase Storage.

---

## Diagnóstico del problema actual

1. **Migración incompleta**: El script `migrate-supabase-to-r2.js` solo lista archivos en la raíz de cada bucket. Los archivos reales están en subcarpetas (ej: `media/userId/1234.mp4`), por lo que **no se migraron**.

2. **URLs en DB**: Las URLs en la base de datos siguen apuntando a Supabase. Aunque `getHybridUrl()` las convierte en runtime, si los archivos no están en R2, la petición falla.

3. **CORS en R2**: Si no está configurado CORS en el bucket de Cloudflare R2, el navegador bloquea las peticiones cross-origin y los videos no cargan.

4. **VITE_R2_PUBLIC_URL**: Debe coincidir exactamente con el dominio público de tu bucket R2.

---

## Plan de ejecución (pasos en orden)

### Paso 1: Verificar configuración R2

1. En Cloudflare Dashboard → R2 → tu bucket
2. Anota el **nombre del bucket** (debe coincidir con `CLOUDFLARE_R2_BUCKET_NAME`)
3. En "Public access" → copia la URL pública (ej: `https://pub-xxx.r2.dev`)
4. En `.env`:
   ```
   VITE_R2_PUBLIC_URL=https://pub-XXX.r2.dev
   CLOUDFLARE_R2_BUCKET_NAME=hideon-media
   ```
   (Reemplaza con tu valor real)

### Paso 2: Configurar CORS en R2

En el bucket de R2 → Settings → CORS policy, usa esta configuración (las cabeceras **ExposeHeaders** son críticas para video):

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "ETag",
      "Content-Type",
      "Content-Length",
      "Accept-Ranges",
      "Content-Range"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

**Importante**: `Content-Length`, `Accept-Ranges` y `Content-Range` permiten que el video haga seek (avanzar/retroceder).

### Paso 3: Migrar archivos recursivamente

Ejecuta el script que migra **todos** los buckets usados (media, post-audio, profiles, avatars, covers, etc.):

```bash
node scripts/migrate-supabase-to-r2.js
```

Solo migra buckets que existan en Supabase. **post-audio** es crítico para el audio de los posts.

Opcional: diagnosticar qué URLs tiene la DB antes de migrar:
```bash
node scripts/diagnose-db-urls.js
```

### Paso 4: Actualizar URLs en la base de datos

```bash
node scripts/update-db-urls-to-r2.js
```

Convierte todas las URLs de Supabase → R2 en `posts` y `profiles`.

### Paso 5: Verificar migración

```bash
node scripts/verify-r2-migration.js
```

Compara cantidades de archivos entre Supabase y R2.

### Paso 6: Desplegar y probar

1. Reinicia la app (o recarga forzada Ctrl+Shift+R para limpiar caché)
2. Comprueba que los videos cargan en el feed y en Reels
3. Abre DevTools → Network y confirma que las peticiones van a `*.r2.dev`

---

## Resultado esperado

- Videos e imágenes cargando desde R2
- Cero egreso de Supabase Storage
- Posts y Reels funcionando como antes

---

## Si algo falla

| Síntoma | Causa probable | Solución |
|---------|----------------|----------|
| Video negro, 0:00/0:00 | Archivo no existe en R2 | Re-ejecutar migración (Paso 3) |
| CORS error en consola | CORS no configurado | Paso 2 |
| 404 en peticiones a r2.dev | URL incorrecta o bucket vacío | Verificar VITE_R2_PUBLIC_URL y Paso 5 |
