HIDEON — Professional Social Network
HIDEON es una plataforma social profesional orientada al ecosistema universitario, diseñada para potenciar la red de contactos, la colaboración en proyectos y el desarrollo profesional de los estudiantes. Permite a los usuarios compartir ideas, unirse a salas de chat temáticas y visibilizar sus proyectos académicos y técnicos en un entorno seguro y optimizado.

👨‍💻 Detalles del Desarrollador
Autor: Heider González (Ingeniero Informático)

Ubicación: Barranquilla, Colombia

Contacto: WhatsApp: +57 300 4497290 (Solo mensajes)

Despliegue Oficial: hsocial-app.onrender.com

🚀 Stack Tecnológico y Arquitectura
El proyecto está construido bajo una arquitectura moderna, desacoplada y escalable, priorizando el rendimiento, la persistencia de datos en tiempo real y la compatibilidad móvil nativa:

Frontend: React con TypeScript, empaquetado con Vite para un desarrollo ultra rápido.

Diseño e Interfaz: Tailwind CSS junto con componentes altamente interactivos de shadcn/ui.

Backend & Base de Datos: Supabase (PostgreSQL) para la gestión de usuarios, base de datos relacional y suscripciones en tiempo real mediante WebSockets.

Almacenamiento de Medios: Integración con Cloudflare R2 para la carga, compresión y distribución eficiente de archivos multimedia.

Lógica Serverless: Supabase Edge Functions (Node.js/Deno) para procesos en segundo plano como la depuración y eliminación automatizada de archivos en el bucket de almacenamiento [cite: El user's técnico desarrollo stack includes React, Vite, Supabase, Node.js, Cloudflare R2, and Capacitor., El user configuró Cloudflare R2 secrets and successfully deployed the delete-from-r2 Supabase Edge Function in May 2026.].

Enfoque Híbrido Móvil: Configurado con Capacitor para permitir la compilación y ejecución fluida del ecosistema web en dispositivos Android.

🛠️ Configuración de Desarrollo
Si deseas explorar el código, realizar pruebas locales o colaborar en el proyecto, sigue estos pasos:

1. Clonación del Repositorio
Bash
git clone <YOUR_GIT_URL>
cd hideon
2. Variables de Entorno
Crea un archivo .env en la raíz del proyecto basándote en el archivo .env.example provisto:

Fragmento de código
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
# (Añade aquí el resto de variables necesarias para tu configuración)
3. Instalación de Dependencias e Inicio
Bash
npm install
npm run dev
📈 Estado del Proyecto
Este repositorio representa la consolidación técnica de un proyecto académico y profesional de gran envergadura. Aunque actualmente el despliegue se encuentra en fase de portafolio y demostración técnica sin captación activa de nuevos usuarios, el código refleja la implementación real de flujos complejos de autenticación, almacenamiento en la nube, optimización de renderizado y manejo de bases de datos relacionales en tiempo real [cite: El user's técnico desarrollo stack includes React, Vite, Supabase, Node.js, Cloudflare R2, and Capacitor., El user configuró Cloudflare R2 secrets and successfully deployed the delete-from-r2 Supabase Edge Function in May 2026., SQL Optimizar: Añadir almacenamiento en caché a las consultas rel...].

© 2026 HIDEON - Barranquilla, Colombia. Desarrollado con dedicación y pasión por la ingeniería.
