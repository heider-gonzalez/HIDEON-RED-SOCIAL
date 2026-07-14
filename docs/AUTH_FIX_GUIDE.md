# Guía de Solución para Errores de Autenticación

## Problemas Identificados

1. **Error 400 en `check_column_exists`**: La función RPC no existe en Supabase
2. **Error 500 en signup**: Problema con el redirect URL en el registro
3. **Logs excesivos**: RecoveryTokenHandler generando mucho ruido en consola

## Soluciones Implementadas

### 1. Función RPC Mejorada (`column-check-fixed.ts`)

- **Fallback automático**: Si la función RPC no existe, usa consulta directa a `information_schema`
- **Caching**: Evita múltiples llamadas a la base de datos
- **Manejo robusto de errores**: No rompe la aplicación si hay problemas

### 2. Corrección del Error 500 en Signup

- **Removido `emailRedirectTo`**: Estaba causando el error 500
- **Mejor manejo de errores**: Mensajes más claros para el usuario
- **Feedback mejorado**: Indica claramente que debe verificar el email

### 3. Reducción de Logs

- **Solo en desarrollo**: Los logs del RecoveryTokenHandler solo aparecen en modo DEV
- **Menos ruido**: Consola más limpia en producción

## Pasos para Solucionar Definitivamente

### Paso 1: Ejecutar SQL en Supabase

Ve a tu panel de Supabase → SQL Editor y ejecuta el archivo `database-fixes.sql`:

```sql
-- Copia y pega el contenido de database-fixes.sql aquí
```

Esto creará:
- La función RPC `check_column_exists`
- Columnas faltantes en las tablas
- Índices para mejor rendimiento
- Permisos necesarios

### Paso 2: Verificar Configuración de Supabase

En tu panel de Supabase → Authentication → Settings:

1. **Site URL**: `https://hsocial-app.onrender.com`
2. **Redirect URLs**: Asegúrate de incluir:
   - `https://hsocial-app.onrender.com/auth`
   - `https://hsocial-app.onrender.com/`
   - `http://localhost:8081` (para desarrollo)

### Paso 3: Variables de Entorno

Asegúrate de tener estas variables en Render.com:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Archivos Modificados

1. **`src/lib/api/posts/retrieve/utils/column-check-fixed.ts`** (nuevo)
   - Función robusta para verificar columnas

2. **`src/components/auth/register/useRegister.ts`**
   - Removido emailRedirectTo problemático
   - Mejor manejo de errores

3. **`src/lib/api.ts`**
   - Usando la función fixed de column check

4. **`src/components/auth/RecoveryTokenHandler.tsx`**
   - Logs solo en desarrollo

5. **`database-fixes.sql`** (nuevo)
   - Script SQL para arreglar la base de datos

## Pruebas

Después de aplicar los fixes:

1. **Registro de usuario**:
   - Intenta crear una cuenta nueva
   - No debería dar error 500
   - Debería mostrar mensaje de verificación por email

2. **Column check**:
   - Los errores 400 deberían desaparecer
   - La aplicación debería funcionar aunque la función RPC no exista

3. **Logs**:
   - Consola más limpia en producción
   - Logs detallados solo en desarrollo

## Si los Problemas Persisten

1. **Verifica la ejecución del SQL**: Asegúrate que todos los comandos se ejecutaron sin errores
2. **Revisa los permisos**: La función RPC necesita permisos para `anon` y `authenticated`
3. **Configuración de email**: Supabase necesita estar configurado para enviar emails de verificación
4. **URLs de redirect**: Verifica que estén configuradas correctamente en el panel de Supabase

## Notas Adicionales

- La aplicación ahora es más robusta y no depende completamente de la función RPC
- Los errores se manejan graciosamente sin romper la experiencia del usuario
- Los mensajes son más claros y útiles
