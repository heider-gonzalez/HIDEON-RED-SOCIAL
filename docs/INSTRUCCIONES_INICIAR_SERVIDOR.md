# Instrucciones para iniciar el servidor de desarrollo

## Problema
Tu página no está cargando porque el servidor de desarrollo no está corriendo. El error `ERR_CONNECTION_REFUSED` indica que no hay ningún proceso escuchando en `http://localhost:8080`.

## Solución rápida

### Opción 1: Usar el script de PowerShell (Recomendado)

1. Abre PowerShell en el directorio del proyecto
2. Ejecuta:
   ```powershell
   .\iniciar-servidor.ps1
   ```

### Opción 2: Instrucciones manuales

1. **Abre una terminal** (PowerShell o CMD) en la carpeta del proyecto:
   ```
   cd "c:\Users\Admin\Desktop\conectar profesionales\hsocial-com-95-43-34-51-74933-01571-44370-main"
   ```

2. **Verifica que las dependencias estén instaladas:**
   ```powershell
   # Verifica si node_modules existe
   Test-Path node_modules
   ```
   
   Si devuelve `False`, instala las dependencias:
   ```powershell
   npm install
   ```
   
   Esto puede tardar varios minutos la primera vez.

3. **Inicia el servidor de desarrollo:**
   ```powershell
   npm run dev
   ```

4. **Espera a ver este mensaje:**
   ```
   VITE v5.x.x  ready in xxx ms

   ➜  Local:   http://localhost:8080/
   ➜  Network: http://192.168.x.x:8080/
   ```

5. **Abre tu navegador** en `http://localhost:8080/`

## Verificación de problemas comunes

### 1. Node.js no está instalado
```powershell
node --version
npm --version
```
Si no aparece una versión, instala Node.js desde: https://nodejs.org/

### 2. El puerto 8080 está en uso
Si el puerto está ocupado, puedes cambiar el puerto en `vite.config.ts`:
```typescript
server: {
  port: 3000, // Cambia el puerto aquí
}
```

### 3. Dependencias desactualizadas
Si hay errores, intenta:
```powershell
npm install --legacy-peer-deps
```

### 4. Limpiar caché
Si sigue fallando:
```powershell
npm cache clean --force
rm -rf node_modules
npm install
```

## Notas importantes

- **Mantén la terminal abierta** mientras usas la aplicación. Si cierras la terminal, el servidor se detendrá.
- El servidor se recarga automáticamente cuando haces cambios en el código.
- Si ves errores de compilación en la terminal, revísalos antes de continuar.

## Estado actual del servidor

Según los diagnósticos:
- ✅ El proyecto existe y tiene la estructura correcta
- ⚠️ Necesitas verificar/instalar las dependencias (`npm install`)
- ⚠️ Necesitas iniciar el servidor (`npm run dev`)

Una vez que ejecutes `npm run dev` y veas el mensaje "Local: http://localhost:8080/", tu página debería cargar correctamente.
