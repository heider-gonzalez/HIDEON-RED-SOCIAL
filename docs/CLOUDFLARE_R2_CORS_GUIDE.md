# Configuración CORS para Cloudflare R2 - Guía Rápida

## Problemas Resueltos

Esta guía resuelve los siguientes errores de red:
- `net::ERR_CONNECTION_RESET` al reproducir videos .mp4 desde R2
- `net::ERR_CONNECTION_TIMED_OUT` al cargar recursos desde iframes de YouTube
- Error HTTP 503 (Service Unavailable) en carga inicial de recursos

## Configuración CORS Recomendada

### Para Desarrollo (Localhost)

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Accept-Ranges",
      "Content-Range",
      "Content-Type",
      "Last-Modified"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

### Para Producción (Recomendado)

```json
[
  {
    "AllowedOrigins": [
      "https://hsocial-app.onrender.com",
      "https://*.lovable.app",
      "https://tudominio.com"
    ],
    "AllowedMethods": ["GET", "HEAD", "OPTIONS"],
    "AllowedHeaders": [
      "Range",
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Requested-With",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Accept-Ranges",
      "Content-Range",
      "Content-Type",
      "Last-Modified",
      "Content-Disposition"
    ],
    "MaxAgeSeconds": 86400
  }
]
```

## Pasos para Configurar CORS en Cloudflare R2

1. **Acceder al Dashboard**
   - Ve a https://dash.cloudflare.com
   - Selecciona tu cuenta
   - Navega a R2 Object Storage
   - Selecciona tu bucket (ej: `pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev`)

2. **Configurar CORS Policy**
   - Ve a la pestaña "Settings"
   - Busca la sección "CORS policy"
   - Haz clic en "Add CORS rule"
   - Pega la configuración JSON anterior
   - Guarda los cambios

3. **Habilitar Acceso Público**
   - En la sección "Public access"
   - Habilita el acceso público
   - Confirma los cambios

4. **Verificar Configuración**
   - Usa curl para verificar:
   ```bash
   curl -I -H "Origin: http://localhost:8081" https://pub-11aaf71a35c74d7da48843fdfc2c1e44.r2.dev/tu-archivo.mp4
   ```
   - Deberías ver headers como:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, HEAD, OPTIONS
   ```

## Mejoras Implementadas en el Código

### 1. Videos de R2 (MediaRenderer.tsx)
- Añadido `crossOrigin="anonymous"` para evitar errores CORS
- Manejo de errores robusto con fallback UI
- Preload optimizado a "metadata"

### 2. Iframes de YouTube (PostContent.tsx)
- Añadido `sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"`
- Añadido `crossOrigin="anonymous"`
- Añadido `referrerPolicy="no-referrer-when-downgrade"`
- Añadido `loading="lazy"` para carga diferida
- Añadido `allow` con permisos específicos

### 3. Error Boundary (MediaErrorBoundary.tsx)
- Nuevo componente para capturar errores de multimedia
- UI de fallback elegante con botón de reintentar
- Logging de errores para debugging

## Uso de MediaErrorBoundary

Envuelve componentes de video con el Error Boundary:

```tsx
import { MediaErrorBoundary } from '@/components/error/MediaErrorBoundary';

<MediaErrorBoundary
  onError={(error, errorInfo) => {
    console.error('Video error:', error, errorInfo);
  }}
>
  <MediaRenderer url={videoUrl} />
</MediaErrorBoundary>
```

## Solución de Problemas

### Videos no cargan desde R2
1. Verifica que CORS esté configurado correctamente
2. Verifica que el bucket tenga acceso público habilitado
3. Verifica que la URL del bucket sea correcta
4. Revisa la consola del navegador para errores específicos

### Iframes de YouTube fallan
1. Verifica que el ID de YouTube sea correcto
2. Verifica que el video no esté restringido por región
3. Los atributos sandbox pueden bloquear algunas funcionalidades, ajusta según necesidad

### Error 503 en carga inicial
1. Verifica que el servidor de Vite esté corriendo
2. Verifica que no haya procesos bloqueando node_modules
3. Limpia caché de navegador y recarga

## Recursos Adicionales

- [Documentación de CORS de Cloudflare R2](https://developers.cloudflare.com/r2/data-access/public-access-buckets/#cors)
- [Documentación de atributos de iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [Documentación de crossOrigin para videos](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/crossorigin)
