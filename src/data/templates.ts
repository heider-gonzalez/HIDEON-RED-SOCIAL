export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  fields: {
    title: string;
    content: string;
  };
}

export const ideaTemplates: Template[] = [
  {
    id: 'problem-solution',
    name: 'Problema-Solución',
    description: 'Identifica un problema y propone una solución',
    category: 'Innovación',
    fields: {
      title: 'Problema: [Describe el problema específico]',
      content: `🎯 PROBLEMA IDENTIFICADO
¿Qué problema has identificado? Sé específico.

👥 AFECTADOS
¿A quién afecta este problema? (estudiantes, empresas, comunidad, etc.)

💡 IDEA/SOLUCIÓN
¿Qué propones hacer para resolverlo? No tiene que estar perfecta.

🚀 BUSCO AHORA
¿Equipo, feedback, validación, alguien con habilidades específicas?

✅ PRÓXIMOS PASOS
¿Qué harías esta semana para avanzar?`
    }
  },
  {
    id: 'collaboration-needed',
    name: 'Busco Colaboradores',
    description: 'Encuentra gente para un proyecto existente',
    category: 'Colaboración',
    fields: {
      title: 'Busco [rol/habilidad] para [nombre del proyecto]',
      content: `📋 PROYECTO
Describe brevemente el proyecto actual.

🎯 OBJETIVO
Qué quieres lograr con este proyecto.

👥 BUSCO
- [Rol 1]: [Qué necesita hacer]
- [Rol 2]: [Qué necesita hacer]
- [Rol 3]: [Qué necesita hacer]

⏰ TIEMPO
¿Cuánto tiempo se necesita? ¿Es remoto/presencial?

🎙️ CONTACTO
¿Cómo pueden contactarte?`
    }
  },
  {
    id: 'learning-journey',
    name: 'Mi Aprendizaje',
    description: 'Comparte lo que estás aprendiendo',
    category: 'Educación',
    fields: {
      title: 'Estoy aprendiendo [tecnología/habilidad]',
      content: `📚 APRENDIENDO
¿Qué estás aprendiendo y por qué?

🎯 OBJETIVO
Para qué quieres aprender esto.

🚧 DESAFÍOS
Qué dificultades has encontrado.

💡 RECURSOS
Libros, cursos, videos que te están ayudando.

🤝 BUSCO
¿Mentoría, grupo de estudio, alguien con quien practicar?

✅ LOGROS
Qué has logrado hasta ahora.`
    }
  },
  {
    id: 'research-question',
    name: 'Pregunta de Investigación',
    description: 'Plantea una duda o pregunta para la comunidad',
    category: 'Investigación',
    fields: {
      title: 'Pregunta: [Tu pregunta específica]',
      content: `❓ PREGUNTA
Formula tu pregunta de manera clara y específica.

📊 CONTEXTO
¿Por qué es importante esta pregunta? ¿Qué has investigado ya?

🎯 OBJETIVO
Qué esperas encontrar o resolver.

💡 HIPÓTESIS
Si tienes una hipótesis, compártela.

🤝 COLABORACIÓN
¿Cómo puede ayudarte la comunidad?

📚 REFERENCIAS
Recursos o enlaces relevantes.`
    }
  }
];

export const projectTemplates: Template[] = [
  {
    id: 'academic-project',
    name: 'Proyecto Académico',
    description: 'Proyecto para la universidad o instituto',
    category: 'Académico',
    fields: {
      title: '[Nombre del Proyecto] - Proyecto Académico',
      content: `🎓 ASIGNATURA/CURSO
¿Para qué asignatura o curso es este proyecto?

📋 DESCRIPCIÓN
Describe el proyecto en 2-3 frases.

🎯 OBJETIVOS
Qué quieres lograr con este proyecto.

🛠️ TECNOLOGÍAS/HERRAMIENTAS
Qué usarás para desarrollarlo.

👥 EQUIPO
¿Trabajas solo o en equipo? ¿Qué roles necesitas?

📅 ENTREGABLES
Qué tienes que entregar y cuándo.

🚀 ESTADO ACTUAL
En qué punto vas del proyecto.

💡 NECESITO
¿Ayuda con alguna parte específica?`
    }
  },
  {
    id: 'startup-mvp',
    name: 'Startup MVP',
    description: 'Producto mínimo viable para una startup',
    category: 'Emprendimiento',
    fields: {
      title: '[Nombre del Producto] - MVP',
      content: `🚀 IDEA RESUMEN
¿Qué resuelve tu producto en una frase?

💡 PROBLEMA
Qué problema del cliente estás solucionando.

🎯 SOLUCIÓN
Cómo tu producto lo resuelve.

👥 MERCADO
Quiénes son tus clientes potenciales.

🛠️ TECNOLOGÍAS
Qué stack tecnológico usarás.

📊 MÉTRICAS
Cómo medirás el éxito.

🤝 BUSCO
Co-fundador, desarrollador, diseñador, mentor.

⏰ ROADMAP
Próximos 3 meses.`
    }
  },
  {
    id: 'open-source',
    name: 'Proyecto Open Source',
    description: 'Contribución a la comunidad de software libre',
    category: 'Open Source',
    fields: {
      title: '[Nombre del Proyecto] - Open Source',
      content: `🌟 VISIÓN
Qué problema resuelve tu proyecto open source.

📋 DESCRIPCIÓN
Describe el proyecto y su propósito.

🛠️ STACK
Tecnologías y arquitectura.

🎯 CARACTERÍSTICAS
Funcionalidades principales.

🤝 CONTRIBUCIÓN
Cómo otros pueden contribuir.

📚 DOCUMENTACIÓN
Estado actual de la documentación.

🐛 ISSUES
Issues abiertos que necesitan ayuda.

🚀 PRÓXIMOS PASOS
Qué viene después en el roadmap.

💬 COMUNIDAD
Dónde pueden encontrarte los usuarios.`
    }
  },
  {
    id: 'personal-project',
    name: 'Proyecto Personal',
    description: 'Proyecto para aprender o por pasión',
    category: 'Personal',
    fields: {
      title: '[Nombre del Proyecto] - Proyecto Personal',
      content: `💫 MOTIVACIÓN
¿Por qué hiciste este proyecto?

📋 DESCRIPCIÓN
Describe qué hace el proyecto.

🎯 APRENDIZAJE
Qué aprendiste mientras lo hacías.

🛠️ TECNOLOGÍAS
Qué herramientas y lenguajes usaste.

🚧 DESAFÍOS
Qué dificultades enfrentaste.

✅ RESULTADOS
Qué lograste al final.

💡 MEJORAS
Qué mejorarías en una próxima versión.

🤝 COMENTARIOS
Feedback que buscas de la comunidad.`
    }
  }
];

export function getTemplateById(type: 'idea' | 'project', id: string): Template | undefined {
  const templates = type === 'idea' ? ideaTemplates : projectTemplates;
  return templates.find(t => t.id === id);
}

export function getTemplatesByCategory(type: 'idea' | 'project'): Record<string, Template[]> {
  const templates = type === 'idea' ? ideaTemplates : projectTemplates;
  return templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, Template[]>);
}
