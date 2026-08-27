# 🌐 HIDEON — Plataforma Académica y Profesional

HIDEON es una plataforma web orientada a estudiantes y profesionales para compartir ideas, formar equipos de trabajo, desarrollar proyectos y comunicarse en tiempo real.

**Autor:** Heider González  
**Ubicación:** Barranquilla, Colombia  
**Demo:** [hsocial-app.onrender.com](https://hsocial-app.onrender.com)

## 🚀 Características

- 👤 Gestión de usuarios y perfiles
- 💡 Publicación y exploración de ideas
- 🤝 Solicitud de participación en proyectos
- 💬 Comunicación en tiempo real
- 📁 Gestión y almacenamiento de archivos
- 🎓 Información académica y profesional
- 🔐 Autenticación y control de acceso
- 📱 Adaptación para dispositivos móviles
- ⚡ Consultas optimizadas y carga progresiva de información

## 🛠️ Stack Tecnológico

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend y base de datos
- Supabase
- PostgreSQL
- WebSockets
- Supabase Edge Functions

### Almacenamiento y servicios
- Cloudflare R2

### Aplicación móvil
- Capacitor
- Android

### Herramientas
- Git
- GitHub
- npm

## 🏗️ Arquitectura

La aplicación utiliza React y TypeScript en el frontend, mientras que Supabase proporciona servicios de autenticación, base de datos PostgreSQL y comunicación en tiempo real.

Para el almacenamiento de archivos se integra Cloudflare R2, mientras que determinadas operaciones backend se gestionan mediante Edge Functions.

La aplicación también fue adaptada para ejecutarse como aplicación móvil mediante Capacitor.

## 💻 Ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/heider-gonzalez/HIDEON-RED-SOCIAL.git
cd hideon
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` a partir de `.env.example`:

```env
VITE_SUPABASE_URL=tu_url
VITE_SUPABASE_ANON_KEY=tu_clave
```

### 4. Ejecutar el proyecto

```bash
npm run dev
```

## 📱 Aplicación móvil

HIDEON también fue preparado para ejecutarse en Android utilizando Capacitor.

## 🎯 Objetivo del proyecto

El objetivo de HIDEON es crear un espacio digital donde estudiantes y profesionales puedan conectar sus conocimientos, compartir ideas y colaborar en proyectos.

El proyecto también representa una aplicación práctica de conceptos de:

- Desarrollo frontend moderno
- Bases de datos relacionales
- Autenticación
- Aplicaciones en tiempo real
- Almacenamiento en la nube
- Optimización de consultas
- Desarrollo multiplataforma

## 📈 Estado del Proyecto

Proyecto técnico de portafolio que implementa flujos complejos de autenticación, almacenamiento en la nube, optimización de rendimiento y bases de datos en tiempo real.

## 👨‍💻 Autor

**Heider González**

Ingeniero Informático | Desarrollador de Software Junior

Barranquilla, Colombia

© 2026 HIDEON — Barranquilla, Colombia
