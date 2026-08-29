# 🌐 HSOCIAL — Plataforma Académica y Profesional

HSOCIAL es una plataforma web y PWA orientada a estudiantes y profesionales para compartir ideas, formar equipos de trabajo, desarrollar proyectos y comunicarse en tiempo real.

**Autor:** Heider González

**Ubicación:** Barranquilla, Colombia

**Demo:** [hideon-red-social.vercel.app](https://www.google.com/search?q=https://hideon-red-social.vercel.app)

## 🚀 Características

* 👤 Gestión de usuarios, perfiles y portafolios
* 💡 Publicación y exploración de ideas de proyectos
* 🤝 Solicitud de colaboración y gestión de equipos
* 💬 Chat y comunicación en tiempo real vía WebSockets
* 🔔 Notificaciones Push en tiempo real (Web Push / VAPID)
* 📁 Almacenamiento seguro de archivos e imágenes
* 🔐 Autenticación OAuth 2.0 (Google) y credenciales con Supabase Auth
* 📱 Progressive Web App (PWA) instalable y adaptada a móviles
* ⚡ Carga optimizada, caché inteligente y consultas progresivas

## 🛠️ Stack Tecnológico

### Frontend & PWA

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Vite PWA Plugin / Service Workers

### Backend & Servicios Cloud

* Supabase (Auth, PostgreSQL, Realtime)
* Supabase Edge Functions (Deno / TypeScript)
* Cloudflare R2 (Almacenamiento de archivos)
* Google Cloud Console (OAuth 2.0 Integration)

### Despliegue e Infraestructura

* Vercel (Hosting Frontend & CI/CD)
* GitHub Actions

### Aplicación Móvil & Herramientas

* Capacitor (Android)
* Git / GitHub / npm

## 🏗️ Arquitectura

La arquitectura de **HSOCIAL** está construida sobre un frontend reactivo en React y TypeScript, desplegado de forma continua en **Vercel**.

La capa de backend, autenticación de usuarios y sincronización en tiempo real es provista por **Supabase** sobre una base de datos PostgreSQL. Las operaciones complejas de servidor y el envío de notificaciones push utilizan **Supabase Edge Functions**. El almacenamiento persistente de archivos multimedia y documentos se gestiona mediante la infraestructura de **Cloudflare R2**.

Adicionalmente, la plataforma cuenta con soporte PWA y una compilación móvil nativa para Android generada con **Capacitor**.

## 💻 Ejecución local

### 1. Clonar el repositorio

```bash
git clone https://github.com/heider-gonzalez/HIDEON-RED-SOCIAL.git
cd HIDEON-RED-SOCIAL

```

### 2. Instalar dependencias

```bash
npm install

```

### 3. Configurar variables de entorno

Crea un archivo `.env` a partir de tus credenciales:

```env
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
VITE_VAPID_PUBLIC_KEY=tu_vapid_public_key

```

### 4. Ejecutar el proyecto

```bash
npm run dev

```

## 📱 Aplicación móvil y PWA

HSOCIAL puede instalarse directamente desde el navegador como una **PWA (Progressive Web App)** o ejecutarse de manera nativa en dispositivos Android mediante el contenedor de **Capacitor**.

## 🎯 Objetivo del proyecto

El objetivo de HSOCIAL es consolidar un ecosistema digital colaborativo donde estudiantes y profesionales puedan conectar talentos, compartir iniciativas y construir proyectos reales.

Representa una aplicación práctica de alto nivel en:

* Arquitectura limpia y escalable en React + TypeScript
* Integración de servicios Serverless y Edge Computing
* Autenticación segura y flujos OAuth 2.0
* Sistemas distribuídos en tiempo real y Web Push Notifications
* Despliegue e integración continua (CI/CD) en Vercel
* Desarrollo multiplataforma (Web, PWA y Móvil)

## 📈 Estado del Proyecto

Proyecto técnico activo de portafolio que implementa arquitecturas cloud modernas, sincronización distribuida en tiempo real y despliegue automatizado en producción.

## 👨‍💻 Autor

**Heider González**

Ingeniero Informático | Desarrollador Full Stack / Software Junior

Barranquilla, Colombia

© 2026 HSOCIAL — Barranquilla, Colombia
