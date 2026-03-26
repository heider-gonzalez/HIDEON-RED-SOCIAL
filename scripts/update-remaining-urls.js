import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wgbbaxvuuinubkgffpiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndnYmJheHZ1dWludWJrZ2ZmcGlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTgxNzg2OCwiZXhwIjoyMDU1MzkzODY4fQ.ntKJlyWN_GZAtQydt0gGnsEH7ivBV-s-IUPy67uijlo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateRemainingURLs() {
  console.log('🔄 Actualizando URLs restantes en la base de datos...\n');
  
  try {
    let totalUpdated = 0;
    let totalErrors = 0;
    
    // 1. Actualizar profiles
    console.log('👤 Actualizando profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url, intro_audio_url')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%,intro_audio_url.ilike.%r2.dev%');
      
    if (!profilesError && profiles) {
      console.log(`📊 Encontrados ${profiles.length} profiles con URLs de R2`);
      
      for (const profile of profiles) {
        try {
          const updates = {};
          
          // Procesar avatar_url
          if (profile.avatar_url && profile.avatar_url.includes('r2.dev')) {
            const fileName = profile.avatar_url.split('/').pop();
            if (fileName) {
              updates.avatar_url = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
              console.log(`   🔄 Actualizando avatar_url: ${fileName}`);
            }
          }
          
          // Procesar cover_url
          if (profile.cover_url && profile.cover_url.includes('r2.dev')) {
            const fileName = profile.cover_url.split('/').pop();
            if (fileName) {
              updates.cover_url = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
              console.log(`   🔄 Actualizando cover_url: ${fileName}`);
            }
          }
          
          // Procesar intro_audio_url
          if (profile.intro_audio_url && profile.intro_audio_url.includes('r2.dev')) {
            const fileName = profile.intro_audio_url.split('/').pop();
            if (fileName) {
              updates.intro_audio_url = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
              console.log(`   🔄 Actualizando intro_audio_url: ${fileName}`);
            }
          }
          
          // Actualizar si hay cambios
          if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update(updates)
              .eq('id', profile.id);
              
            if (updateError) {
              throw new Error(`Error actualizando profile ${profile.id}: ${updateError.message}`);
            }
            
            console.log(`   ✅ Profile ${profile.id} actualizado`);
            totalUpdated++;
          }
          
        } catch (error) {
          console.error(`   ❌ Error actualizando profile ${profile.id}:`, error.message);
          totalErrors++;
        }
      }
    }
    
    // 2. Actualizar posts con audio_url
    console.log('\n🎵 Actualizando posts con audio_url...');
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, audio_url')
      .ilike('audio_url', '%r2.dev%');
      
    if (!postsError && posts) {
      console.log(`📊 Encontrados ${posts.length} posts con audio_url de R2`);
      
      for (const post of posts) {
        try {
          const fileName = post.audio_url.split('/').pop();
          if (fileName) {
            const supabaseUrl = `https://wgbbaxvuuinubkgffpiq.supabase.co/storage/v1/object/public/media/${fileName}`;
            
            const { error: updateError } = await supabase
              .from('posts')
              .update({ audio_url: supabaseUrl })
              .eq('id', post.id);
              
            if (updateError) {
              throw new Error(`Error actualizando post ${post.id}: ${updateError.message}`);
            }
            
            console.log(`   ✅ Post ${post.id} audio_url actualizado: ${fileName}`);
            totalUpdated++;
          }
          
        } catch (error) {
          console.error(`   ❌ Error actualizando post ${post.id}:`, error.message);
          totalErrors++;
        }
      }
    }
    
    // 3. Verificación final
    console.log('\n🔍 Verificación final...');
    
    const { data: remainingProfiles, error: remainingError } = await supabase
      .from('profiles')
      .select('id, avatar_url, cover_url, intro_audio_url')
      .or('avatar_url.ilike.%r2.dev%,cover_url.ilike.%r2.dev%,intro_audio_url.ilike.%r2.dev%');
      
    if (!remainingError && remainingProfiles) {
      if (remainingProfiles.length === 0) {
        console.log('✅ No quedan URLs de R2 en profiles');
      } else {
        console.log(`⚠️ Quedan ${remainingProfiles.length} profiles con URLs de R2:`);
        remainingProfiles.forEach((profile, index) => {
          console.log(`   ${index + 1}. ID: ${profile.id}`);
          if (profile.avatar_url?.includes('r2.dev')) console.log(`      avatar_url: ${profile.avatar_url.substring(0, 80)}...`);
          if (profile.cover_url?.includes('r2.dev')) console.log(`      cover_url: ${profile.cover_url.substring(0, 80)}...`);
          if (profile.intro_audio_url?.includes('r2.dev')) console.log(`      intro_audio_url: ${profile.intro_audio_url.substring(0, 80)}...`);
        });
      }
    }
    
    const { data: remainingPosts, error: postsRemainingError } = await supabase
      .from('posts')
      .select('id, audio_url')
      .ilike('audio_url', '%r2.dev%');
      
    if (!postsRemainingError && remainingPosts) {
      if (remainingPosts.length === 0) {
        console.log('✅ No quedan URLs de R2 en posts');
      } else {
        console.log(`⚠️ Quedan ${remainingPosts.length} posts con audio_url de R2:`);
        remainingPosts.forEach((post, index) => {
          console.log(`   ${index + 1}. ID: ${post.id} -> ${post.audio_url.substring(0, 80)}...`);
        });
      }
    }
    
    console.log(`\n🎉 Actualización completada:`);
    console.log(`   ✅ Registros actualizados: ${totalUpdated}`);
    console.log(`   ❌ Errores: ${totalErrors}`);
    console.log(`   📊 Total procesado: ${totalUpdated + totalErrors}`);
    
  } catch (error) {
    console.error('❌ Error en actualización:', error.message);
  }
}

updateRemainingURLs();
