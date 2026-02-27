/**
 * Diccionario de copy profesional para HIDEON 2.
 * Centraliza el cambio de términos casuales a profesionales.
 */

export const COPY = {
  // Navegación y secciones
  nav: {
    explore: "Explorar MVPs",
    feed: "Feed de Actualizaciones",
    dashboard: "Dashboard",
    pitches: "Pitches de Innovación",
    collaboration: "Red de Colaboración",
    profile: "Portfolio Técnico",
    settings: "Configuración",
  },

  // Acciones
  actions: {
    publish: "Publicar MVP",
    create: "Crear MVP",
    edit: "Editar",
    save: "Guardar",
    cancel: "Cancelar",
    delete: "Eliminar",
    collaborate: "Solicitar colaboración",
    follow: "Seguir",
    unfollow: "Dejar de seguir",
    endorse: "Avalar",
    share: "Compartir",
    apply: "Postularme",
    join: "Unirse",
  },

  // Tipos de contenido
  contentTypes: {
    post: "MVP",
    idea: "Idea",
    project: "Proyecto",
    reel: "Pitch de Innovación",
    event: "Evento",
    poll: "Encuesta",
    job: "Empleo",
    service: "Servicio",
  },

  // Métricas y redes
  metrics: {
    followers: "Red de Colaboración",
    following: "Siguiendo",
    likes: "Avalos",
    views: "Vistas",
    shares: "Compartidos",
    comments: "Comentarios",
    participants: "Participantes",
    endorsements: "Avales",
  },

  // Estados de MVP
  mvpStatus: {
    in_development: "En desarrollo",
    mvp_functional: "MVP funcional",
    scalable: "Escalable",
    idea: "Idea",
    completed: "Completado",
  },

  // Universidades (Barranquilla)
  universities: {
    uninorte: "Universidad del Norte",
    cuc: "Universidad de la Costa",
    simon: "Universidad Simón Bolívar",
    autónoma: "Universidad Autónoma del Caribe",
    reformada: "Universidad Reformada",
    sena: "SENA",
    other: "Otra (No listada)",
  },

  // Facultades (Barranquilla)
  faculties: {
    engineering: "Ingeniería",
    design: "Diseño",
    business: "Negocios",
    health: "Salud",
    education: "Educación",
    communication: "Comunicación",
    law: "Derecho",
    architecture: "Arquitectura",
    other: "Otra",
  },

  // Placeholder textos
  placeholders: {
    search: "Buscar MVPs, talento o universidades...",
    institution: "Selecciona tu institución",
    faculty: "Selecciona tu facultad",
    status: "Estado del MVP",
    title: "Título del MVP",
    description: "Describe tu MVP, problema y solución...",
    technologies: "Tecnologías (ej: React, Node.js, Python)",
    team: "Miembros del equipo",
    otherInstitution: "Escribe el nombre de tu institución",
  },

  // Etiquetas y badges
  badges: {
    university: "Universidad",
    faculty: "Facultad",
    technologies: "Stack tecnológico",
    maturity: "Madurez del MVP",
    endorsed: "Avalado por profesionales",
    featured: "Destacado",
    new: "Nuevo",
  },

  // Mensajes y notificaciones
  messages: {
    mvpPublished: "Tu MVP se ha publicado correctamente.",
    pitchPublished: "Tu pitch se ha publicado correctamente.",
    endorsementReceived: "Tu MVP ha sido avalado por un profesional.",
    collaborationRequested: "Has solicitado colaboración en este MVP.",
    collaborationAccepted: "Han aceptado tu solicitud de colaboración.",
  },

  // SEO y meta
  seo: {
    title: "HIDEON — Plataforma Profesional de MVPs y Talento Universitario",
    description: "Exhibe tu MVP, valida tu tracción y construye una red de colaboración profesional. Foco en Barranquilla.",
    keywords: "MVP, proyectos universitarios, Barranquilla, talento, startups, innovación",
  },
} as const;

// Helper para obtener copy con fallback
export function getCopy<T extends keyof typeof COPY>(key: T): string {
  const value = COPY[key];
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    // Para objetos anidados, devolver el primer valor string encontrado o una clave por defecto
    const firstKey = Object.keys(value)[0] as keyof typeof value;
    const firstValue = value[firstKey];
    return typeof firstValue === 'string' ? firstValue : String(firstValue);
  }
  return String(value);
}

// Helper para obtener copy anidado con fallback
export function getNestedCopy<
  K extends keyof typeof COPY,
  N extends keyof typeof COPY[K]
>(key: K, nestedKey: N): string {
  const section = COPY[key];
  if (typeof section === 'object' && section !== null) {
    const value = section[nestedKey as keyof typeof section];
    return typeof value === 'string' ? value : String(value);
  }
  return String(section);
}
