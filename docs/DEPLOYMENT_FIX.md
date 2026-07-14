# Fix para 404 en Recarga de Páginas - Render.com

## Problema
La aplicación HSocial muestra "Not Found" al recargar páginas como `/home`, `/profile`, etc. en Render.com.

## Causa
El problema ocurre porque React Router maneja las rutas del lado del cliente (SPA), pero el servidor de Render.com no sabe cómo manejar estas rutas cuando se recarga directamente la página.

## Solución Implementada

### 1. Archivo de Servidor Express (`server.js`)
- Crea un servidor Express simple que sirve los archivos estáticos
- Implementa fallback para SPA: todas las rutas no-API sirven `index.html`
- Configurado para el puerto 10000 (estándar de Render.com)

### 2. Configuración de Render.com (`render.yaml`)
- Define el servicio web con Node.js
- Comando de construcción: `npm install && npm run build`
- Comando de inicio: `npm start`
- Variables de entorno para Node.js 18

### 3. Redirecciones SPA (`public/_redirects`)
- Configura redirecciones para archivos estáticos
- Implementa fallback a `index.html` para todas las demás rutas
- Compatible con el sistema de redirecciones de Render.com

### 4. Dependencias Actualizadas
- Agregado Express como dependencia de producción
- Script `start` agregado a package.json

## Archivos Modificados/Creados

1. **server.js** (nuevo)
   - Servidor Express para producción
   - Manejo de rutas SPA

2. **render.yaml** (nuevo)
   - Configuración del servicio Render.com
   - Comandos de build y start

3. **public/_redirects** (actualizado)
   - Redirecciones más explícitas
   - Manejo de archivos estáticos

4. **package.json** (actualizado)
   - Dependencia Express agregada
   - Script start agregado

## Pasos para Deploy

1. **Hacer commit de los cambios:**
   ```bash
   git add .
   git commit -m "Fix SPA routing for Render.com - add server and redirects"
   git push
   ```

2. **Deploy en Render.com:**
   - Render.com detectará automáticamente los cambios
   - Usará `render.yaml` para configuración
   - Ejecutará `npm install && npm run build`
   - Iniciará con `npm start`

3. **Verificación:**
   - Visita `https://hsocial-app.onrender.com/home`
   - Recarga la página (F5)
   - La página debería cargar correctamente sin 404

## Rutas que Deberían Funcionar

- `/` - Página principal
- `/home` - Home autenticado
- `/profile/:userId` - Perfiles de usuario
- `/friends` - Amigos
- `/messages` - Mensajes
- `/settings` - Configuración
- Todas las demás rutas de la aplicación

## Notas Técnicas

- El servidor Express solo se usa en producción
- En desarrollo sigue usando Vite dev server
- Las rutas API (si existen) no son afectadas
- Los archivos estáticos (CSS, JS, imágenes) se sirven directamente

## Alternativas Consideradas

1. **Hash Router:** Cambiar a `HashRouter` en React Router
   - Ventaja: No requiere configuración del servidor
   - Desventaja: URLs menos limpias (`/#/home` en lugar de `/home`)

2. **Configuración pura de _redirects:** Sin servidor Express
   - Ventaja: Más simple
   - Desventaja: Menos control sobre el manejo de rutas

La solución actual (Express + _redirects) proporciona el mejor balance entre fiabilidad y control.
