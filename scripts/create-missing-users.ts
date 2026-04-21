import { supabaseAdmin } from './supabase-admin';

type ProfileInsert = {
  id: string;
  username: string;
  bio: string;
  career: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
};

async function createMissingUsers() {
  console.log('👥 Creando usuarios faltantes...');
  
  const missingUsers = [
    {
      username: 'Lucía Mendivelso',
      email: 'lucia.mendivelso.bot@hsocial.local',
      bio: 'Ciencias Políticas y Relaciones Internacionales. Experta en soberanía y autodeterminación. 🌍',
      career: 'Ciencias Políticas',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lucia_mendivelso'
    },
    {
      username: 'Mayor (R) Andrés Gaviria',
      email: 'andres.gaviria.defensa.bot@hsocial.local',
      bio: 'Estrategia y Defensa Nacional. Experto en seguridad marítima y protección de soberanía. ⚓',
      career: 'Ciencias Militares',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=gaviria_defensa'
    }
  ];

  for (const user of missingUsers) {
    try {
      // Crear usuario auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: 'BotPassword123!',
        email_confirm: true,
        user_metadata: {
          username: user.username,
          is_bot: true,
        },
      });

      if (authError) {
        console.error(`❌ Error creando auth user ${user.username}:`, authError.message);
        continue;
      }

      const userId = authData.user.id;
      console.log(`✅ Usuario auth creado: ${user.username} (${userId})`);

      // Crear perfil
      const profile: ProfileInsert = {
        id: userId,
        username: user.username,
        bio: user.bio,
        career: user.career,
        avatar_url: user.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await (supabaseAdmin as any)
        .from('profiles')
        .insert(profile);

      if (profileError) {
        console.error(`❌ Error creando perfil de ${user.username}:`, profileError.message);
      } else {
        console.log(`✅ Perfil creado: ${user.username}`);
      }

    } catch (err) {
      console.error(`❌ Error creando usuario ${user.username}:`, err);
    }
    console.log('---');
  }

  console.log('✅ Usuarios faltantes creados');
}

createMissingUsers().catch(console.error);
