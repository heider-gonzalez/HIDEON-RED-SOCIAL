import { supabase } from "@/integrations/supabase/client";
import { uploadToSupabase } from "@/lib/storage/cloudflare-r2";

/**
 * Script de prueba para migrar solo un perfil específico
 * Reemplaza 'YOUR_USER_ID' con tu ID de usuario real
 */
export async function testMigrateSingleProfile() {
  console.log('Test migration: Iniciando migración para perfil específico...');
  
  // User ID específico para el test
  const TEST_USER_ID = 'a12b715b-588a-41eb-bc09-5739bb579894';

  try {
    // 1. Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url')
      .eq('id', TEST_USER_ID)
      .single();

    if (profileError) {
      console.error('Error obteniendo perfil:', profileError);
      throw profileError;
    }

    console.log('Perfil encontrado:', {
      id: (profile as any).id,
      avatar_url: (profile as any).avatar_url,
      cover_url: (profile as any).cover_url
    });

    if (!(profile as any).avatar_url && !(profile as any).cover_url) {
      console.log('El perfil no tiene imágenes para migrar');
      return;
    }

    // 2. Migrar avatar si existe
    if ((profile as any).avatar_url && (profile as any).avatar_url.includes('supabase')) {
      console.log('Migrando avatar...');
      
      try {
        // Descargar avatar
        const response = await fetch((profile as any).avatar_url);
        if (!response.ok) {
          throw new Error(`Error descargando avatar: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const fileName = (profile as any).avatar_url.split('/').pop() || `${TEST_USER_ID}_avatar`;
        const file = new File([blob], fileName, { type: blob.type });

        // Subir a R2
        const newPath = `profiles/${TEST_USER_ID}/avatar/${fileName}`;
        const newUrl = await uploadToSupabase(file, newPath, { allowFallback: false });

        // Actualizar en base de datos
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ 
            avatar_url: newUrl, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', TEST_USER_ID);

        if (updateError) {
          throw new Error(`Error actualizando avatar: ${updateError.message}`);
        }

        console.log('Avatar migrado exitosamente:');
        console.log('  Antes:', (profile as any).avatar_url);
        console.log('  Después:', newUrl);

      } catch (error) {
        console.error('Error migrando avatar:', error);
      }
    }

    // 3. Migrar cover si existe
    if ((profile as any).cover_url && (profile as any).cover_url.includes('supabase')) {
      console.log('Migrando cover...');
      
      try {
        // Descargar cover
        const response = await fetch((profile as any).cover_url);
        if (!response.ok) {
          throw new Error(`Error descargando cover: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const fileName = (profile as any).cover_url.split('/').pop() || `${TEST_USER_ID}_cover`;
        const file = new File([blob], fileName, { type: blob.type });

        // Subir a R2
        const newPath = `profiles/${TEST_USER_ID}/cover/${fileName}`;
        const newUrl = await uploadToSupabase(file, newPath, { allowFallback: false });

        // Actualizar en base de datos
        const { error: updateError } = await (supabase as any)
          .from('profiles')
          .update({ 
            cover_url: newUrl, 
            updated_at: new Date().toISOString() 
          })
          .eq('id', TEST_USER_ID);

        if (updateError) {
          throw new Error(`Error actualizando cover: ${updateError.message}`);
        }

        console.log('Cover migrado exitosamente:');
        console.log('  Antes:', (profile as any).cover_url);
        console.log('  Después:', newUrl);

      } catch (error) {
        console.error('Error migrando cover:', error);
      }
    }

    // 4. Verificar resultado
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url')
      .eq('id', TEST_USER_ID)
      .single();

    console.log('\nPerfil actualizado:');
    console.log('  avatar_url:', (updatedProfile as any)?.avatar_url);
    console.log('  cover_url:', (updatedProfile as any)?.cover_url);

    // 5. Test de acceso a las nuevas URLs
    console.log('\nVerificando acceso a las nuevas URLs...');
    
    if ((updatedProfile as any)?.avatar_url) {
      try {
        const avatarTest = await fetch((updatedProfile as any).avatar_url, { method: 'HEAD' });
        console.log(`Avatar URL: ${avatarTest.ok ? 'OK' : 'ERROR'} (${avatarTest.status})`);
      } catch (error) {
        console.log(`Avatar URL: ERROR - ${error}`);
      }
    }

    if ((updatedProfile as any)?.cover_url) {
      try {
        const coverTest = await fetch((updatedProfile as any).cover_url, { method: 'HEAD' });
        console.log(`Cover URL: ${coverTest.ok ? 'OK' : 'ERROR'} (${coverTest.status})`);
      } catch (error) {
        console.log(`Cover URL: ERROR - ${error}`);
      }
    }

    console.log('\nTest migration completado exitosamente!');

  } catch (error) {
    console.error('Error en test migration:', error);
    throw error;
  }
}

/**
 * Función para obtener el user_id del usuario actual
 */
export async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Usuario no autenticado');
  }
  return user.id;
}

/**
 * Test migration automático para el usuario actual
 */
export async function testMigrateCurrentUser() {
  try {
    const userId = await getCurrentUserId();
    console.log(`Test migration para usuario actual: ${userId}`);
    
    // Actualizar el script con el user_id actual
    const script = testMigrateSingleProfile.toString();
    const updatedScript = script.replace("const TEST_USER_ID = 'YOUR_USER_ID'", `const TEST_USER_ID = '${userId}'`);
    
    // Evaluar el script actualizado
    eval(`(${updatedScript})()`);
    
  } catch (error) {
    console.error('Error en test migration para usuario actual:', error);
  }
}

// Funciones globales para ejecución manual
(window as any).testMigrateSingleProfile = testMigrateSingleProfile;
(window as any).getCurrentUserId = getCurrentUserId;
(window as any).testMigrateCurrentUser = testMigrateCurrentUser;
