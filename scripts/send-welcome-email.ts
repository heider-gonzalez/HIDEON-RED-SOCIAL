import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

// Debug: Mostrar variables de entorno cargadas
console.log('🔍 Debug - Variables de entorno:');
console.log('  VITE_SUPABASE_URL:', supabaseUrl ? '✅ Cargada' : '❌ No encontrada');
console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Cargada' : '❌ No encontrada');
console.log('  SMTP_USER:', smtpUser ? `✅ ${smtpUser}` : '❌ No encontrada');
console.log('  SMTP_PASS:', smtpPass ? '✅ Cargada' : '❌ No encontrada');
console.log();

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL y API key requeridos');
  process.exit(1);
}

if (!smtpUser || !smtpPass) {
  console.error('Error: SMTP_USER y SMTP_PASS requeridos en .env');
  console.error('Por favor configura tus credenciales de Gmail en el archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Plantilla HTML con estética Cyberpunk de HIDEON
const createEmailTemplate = (username: string) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido de nuevo a HIDEON</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
      color: #e0e0e0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .logo {
      font-size: 48px;
      font-weight: bold;
      background: linear-gradient(90deg, #00d4ff, #7c3aed, #00d4ff);
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient 3s ease infinite;
      margin-bottom: 10px;
    }
    @keyframes gradient {
      0%, 100% { background-position: 0% center; }
      50% { background-position: 200% center; }
    }
    .tagline {
      color: #00d4ff;
      font-size: 14px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }
    .content {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.2);
      border-radius: 16px;
      padding: 40px;
      backdrop-filter: blur(10px);
      box-shadow: 0 0 30px rgba(0, 212, 255, 0.1);
    }
    .greeting {
      font-size: 24px;
      margin-bottom: 20px;
      color: #ffffff;
    }
    .message {
      line-height: 1.8;
      color: #b0b0b0;
      margin-bottom: 30px;
    }
    .features {
      margin: 30px 0;
      padding: 20px;
      background: rgba(124, 58, 237, 0.1);
      border-left: 3px solid #7c3aed;
      border-radius: 8px;
    }
    .feature-item {
      margin: 15px 0;
      padding-left: 20px;
      position: relative;
    }
    .feature-item:before {
      content: "▸";
      position: absolute;
      left: 0;
      color: #00d4ff;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(90deg, #00d4ff, #7c3aed);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 50px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 30px 0;
      box-shadow: 0 0 20px rgba(0, 212, 255, 0.4);
      transition: transform 0.3s ease;
    }
    .cta-button:hover {
      transform: scale(1.05);
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #00d4ff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">HIDEON</div>
      <div class="tagline">Social Network del Futuro</div>
    </div>
    
    <div class="content">
      <h1 class="greeting">¡Bienvenido de nuevo, ${username}! 🚀</h1>
      
      <p class="message">
        Te extrañamos en HIDEON. La comunidad ha estado activa y hemos implementado 
        nuevas mejoras que te encantarán.
      </p>
      
      <div class="features">
        <div class="feature-item">
          <strong>Sistema de Reacciones v7.0:</strong> Más rápido, más fluido, 
          con nuevas animaciones y mejor experiencia de usuario.
        </div>
        <div class="feature-item">
          <strong>Mejoras de Rendimiento:</strong> Carga instantánea, 
          navegación más suave y optimización de recursos.
        </div>
        <div class="feature-item">
          <strong>Conecta con la Comunidad:</strong> Descubre nuevos proyectos, 
          colabora con otros desarrolladores y comparte tus ideas.
        </div>
      </div>
      
      <p class="message">
        Estamos emocionados de verte de nuevo. Tu presencia en la plataforma 
        hace que HIDEON sea un lugar mejor para todos.
      </p>
      
      <div style="text-align: center;">
        <a href="http://localhost:8083" class="cta-button">Ingresar a HIDEON</a>
      </div>
    </div>
    
    <div class="footer">
      <p>Este correo fue enviado automáticamente por HIDEON.</p>
      <p>¿No te registraste en HIDEON? Ignora este correo.</p>
      <p>
        <a href="http://localhost:8083">hsocial-app.onrender.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`;

async function sendWelcomeEmails() {
  console.log('🚀 Iniciando envío de correos de bienvenida...\n');

  try {
    // Configurar transporter de nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verificar conexión
    await transporter.verify();
    console.log('✅ Conexión SMTP establecida correctamente\n');

    // Obtener todos los usuarios de Supabase (auth.users y profiles)
    console.log('📥 Obteniendo lista de usuarios de Supabase...');

    // Obtener usuarios de auth.users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('❌ Error al obtener usuarios de auth:', authError.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  No se encontraron usuarios en la base de datos');
      process.exit(0);
    }

    // Obtener perfiles para usernames
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username');

    if (profilesError) {
      console.error('❌ Error al obtener perfiles:', profilesError.message);
      process.exit(1);
    }

    // Combinar datos de auth.users con profiles
    const usersWithEmail = users.map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      return {
        email: user.email,
        username: profile?.username || user.email?.split('@')[0] || 'Usuario'
      };
    }).filter(u => u.email);

    console.log(`📊 Se encontraron ${usersWithEmail.length} usuarios con correo electrónico\n`);
    console.log('='.repeat(60));

    // Enviar correos uno por uno con delay
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < usersWithEmail.length; i++) {
      const user = usersWithEmail[i];
      const username = user.username || 'Usuario';

      try {
        const mailOptions = {
          from: `"HIDEON" <${smtpUser}>`,
          to: user.email,
          subject: '🚀 ¡Bienvenido de nuevo a HIDEON! Nuevas mejoras disponibles',
          html: createEmailTemplate(username),
        };

        await transporter.sendMail(mailOptions);
        successCount++;
        console.log(`[${i + 1}/${usersWithEmail.length}] ✅ Correo enviado con éxito a ${user.email}`);

        // Delay de 1.5 segundos para evitar spam
        if (i < usersWithEmail.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }

      } catch (emailError) {
        errorCount++;
        console.log(`[${i + 1}/${usersWithEmail.length}] ❌ Error al enviar a ${user.email}: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Resumen del envío:');
    console.log(`   ✅ Exitosos: ${successCount}`);
    console.log(`   ❌ Fallidos: ${errorCount}`);
    console.log(`   📊 Total: ${usersWithEmail.length}`);
    console.log('='.repeat(60));

    if (errorCount > 0) {
      console.log('\n⚠️  Algunos correos no pudieron ser enviados. Revisa los errores arriba.');
    } else {
      console.log('\n🎉 ¡Todos los correos fueron enviados exitosamente!');
    }

  } catch (error) {
    console.error('❌ Error general:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

sendWelcomeEmails().catch(console.error);
