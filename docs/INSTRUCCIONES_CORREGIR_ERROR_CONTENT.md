# 🔧 Instrucciones para Corregir el Error de 'content' en Notificaciones

## 🐛 Error Reportado
```
Error: la columna 'contenido' de la relación 'notificaciones' no existe
o
column 'content' of relation 'notifications' does not exist
```

## ✅ Solución

El problema es que **algún código o trigger en la base de datos está intentando usar la columna 'content' o 'contenido' en lugar de 'message'** al crear notificaciones.

### Paso 1: Ejecutar el Script SQL de Corrección

He creado un script SQL completo que corrige este problema. Sigue estos pasos:

1. **Abre Supabase Dashboard**
   - Ve a: https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre el SQL Editor**
   - En el menú lateral, haz clic en "SQL Editor"
   - Haz clic en "New query"

3. **Copia y Pega el Script**
   - Abre el archivo: `sql/fix_notification_content_column.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor de Supabase

4. **Ejecuta el Script**
   - Haz clic en "Run" o presiona `Ctrl+Enter`
   - Espera a que termine de ejecutarse

5. **Verifica los Resultados**
   - Deberías ver mensajes de éxito
   - Si hay errores, cópialos y compártelos

### Paso 2: Verificar que Funcione

Después de ejecutar el script:

1. **Recarga tu aplicación** en el navegador
2. **Intenta reaccionar** a una publicación de otro usuario
3. **Verifica** que no aparezca el error

## 📝 Qué hace el Script

El script:
1. ✅ Busca funciones que usen 'content' incorrectamente
2. ✅ Reemplaza la función `create_notification` para usar 'message'
3. ✅ Crea/actualiza el trigger correcto para reacciones
4. ✅ Elimina triggers antiguos que puedan estar causando problemas
5. ✅ Verifica que la estructura de la tabla sea correcta

## 🔍 Si el Error Persiste

Si después de ejecutar el script el error continúa:

1. **Revisa los mensajes** que aparecen al ejecutar el script
2. **Busca errores específicos** en la salida del SQL Editor
3. **Compárteme los errores** que aparezcan

## 📄 Archivos Creados

- `sql/fix_notification_content_column.sql` - Script completo de corrección
- Este archivo con las instrucciones

## ⚠️ Importante

- **Ejecuta el script solo UNA vez**
- El script es seguro y no borrará datos
- Solo corrige funciones y triggers
