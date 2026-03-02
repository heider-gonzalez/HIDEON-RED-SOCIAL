---
name: "HSocial University Strategy"
overview: "Plan estrategico y tecnico para convertir HSocial en la plataforma que toda universidad de Barranquilla quiera adoptar, basado en el analisis de lo que ya existe y lo que falta."
createdAt: "2026-02-28T01:40:36.187Z"
updatedAt: "2026-02-28T01:40:36.187Z"
---

# Plan Estrategico HSocial - Red Universitaria Barranquilla

## Diagnostico: Lo que YA existe (solido)

| Area | Estado | Detalle |
|------|--------|---------|
| Perfiles | Completo | career, semester, institution_name, academic_role, avatar, cover, bio, portfolio, logros, tarjeta profesional |
| Publicaciones | Completo | Ideas, Proyectos, Encuestas, Eventos, Servicios, Audio/Musica, Reels |
| Colaboracion | Parcial | Ideas con participantes, roles, skills. Chat de idea. Grupos. Equipos (shell vacio) |
| Instituciones | Basico | 16 universidades de Barranquilla hardcoded. Selector en onboarding. Filtro en publicaciones |
| Gamificacion | Basico | Leaderboard con "coquitos", badges, achievements |
| Social | Completo | Seguir, mensajes privados, chat global, reacciones, comentarios, compartir |
| Eventos | Funcional | Conferencias, seminarios, talleres, hackathons, webinars, networking, ferias |

## Diagnostico: Lo que FALTA (oportunidades criticas)

### 1. VERIFICACION UNIVERSITARIA (Prioridad MAXIMA)
**Sin esto, ninguna universidad toma en serio la plataforma.**

- Verificacion por dominio de email (.edu.co): @uninorte.edu.co, @est.uniatlantico.edu.co, etc.
- Badge de "Estudiante Verificado" visible en perfil y posts
- Tabla `university_email_domains` con dominios por institucion
- Flow: Registro -> Vincula email institucional -> Recibe codigo -> Verificado

**Archivos clave:**
- `src/data/institutions-barranquilla.ts` (agregar dominios)
- `src/components/auth/` (flujo de verificacion)
- `src/components/profile/ProfileBadges.tsx` (badge verificado)
- Nueva migracion SQL para `university_email_domains`

### 2. DASHBOARD UNIVERSITARIO (Lo que vende a los rectores)
**Cada universidad necesita ver su impacto.**

- Pagina publica `/university/:slug` con:
  - Logo, descripcion, numero de estudiantes activos
  - Top proyectos de la universidad
  - Top ideas
  - Estudiantes destacados
  - Estadisticas: proyectos creados, ideas, equipos formados, eventos
- Panel privado para admin de universidad:
  - Metricas de engagement
  - Proyectos por carrera
  - Habilidades mas demandadas

**Archivos clave:**
- Nueva pagina `src/pages/UniversityDetail.tsx`
- Nueva ruta en `src/App.tsx`
- Nueva migracion SQL para `university_pages`

### 3. EQUIPOS FUNCIONALES (Teams esta vacio)
**El page Teams.tsx existe pero es solo un shell.**

- Crear equipo con: nombre, descripcion, proyecto asociado, habilidades buscadas
- Invitar miembros por universidad o habilidad
- Chat de equipo
- Tabla `teams`, `team_members`
- Matching: "Buscamos un disenador UX de CUC para nuestro equipo"

**Archivos clave:**
- `src/pages/Teams.tsx` (reescribir completo)
- Nuevas tablas SQL

### 4. RETOS INTER-UNIVERSITARIOS (El gancho viral)
**Esto genera competencia sana y atencion mediatica.**

- Challenges/hackathons entre universidades
- Ranking por universidad (cual tiene mas proyectos, ideas, participacion)
- Leaderboard inter-universitario visible en `/leaderboard`
- Feria de Proyectos Digital: evento semestral donde cada universidad muestra sus mejores proyectos

**Archivos clave:**
- `src/pages/Leaderboard.tsx` (agregar tab inter-universitario)
- Nueva pagina `src/pages/Challenges.tsx`
- Nuevas tablas SQL

### 5. BOLSA DE TALENTO / OPORTUNIDADES
**Conectar estudiantes con empresas locales.**

- Empresas publican: pasantias, practicas, empleos junior
- Estudiantes aplican con su perfil + portafolio de HSocial
- Filtrar por universidad, carrera, semestre, habilidades
- La pagina Companies ya existe pero necesita seccion de oportunidades

**Archivos clave:**
- `src/pages/CompanyDetail.tsx` (agregar tab oportunidades)
- Nueva pagina `src/pages/Opportunities.tsx`

### 6. MENTORIA
**Conectar egresados/profesores con estudiantes.**

- Perfil de mentor (egresado o profesor)
- Solicitar mentoria
- Sesiones agendables
- academic_role ya existe en el schema

**Archivos clave:**
- `src/types/database/profile.types.ts` (campo academic_role ya existe)
- Nueva pagina `src/pages/Mentors.tsx`

---

## Propuesta de Valor por Stakeholder

### Para el RECTOR / DECANO:
- "Mire cuantos proyectos innovadores producen sus estudiantes"
- Dashboard con metricas de engagement e innovacion
- Competencia visible contra otras universidades
- Marketing gratuito: cada proyecto exitoso lleva el nombre de la universidad

### Para el ESTUDIANTE:
- Portafolio profesional automatico (cada proyecto que sube ES su CV)
- Encontrar compañeros para proyectos de clase
- Acceso a pasantias y empleo
- Mentoria de egresados exitosos
- Competir en retos y ganar reconocimiento

### Para la EMPRESA:
- Pipeline de talento filtrado por universidad, carrera, habilidades
- Ver proyectos reales, no solo hojas de vida
- Publicar oportunidades directamente a estudiantes

---

## Prioridades de Implementacion (Fases)

### Fase 1: Credibilidad (2-3 semanas)
1. Verificacion por email universitario
2. Badge de estudiante verificado
3. Pagina publica de universidad (MVP)

### Fase 2: Engagement (2-3 semanas)
4. Teams funcional (crear, invitar, chat)
5. Leaderboard inter-universitario
6. Retos/challenges basicos

### Fase 3: Monetizacion y escala (3-4 semanas)
7. Bolsa de talento/oportunidades
8. Dashboard privado para universidades (metricas)
9. Mentoria

---

## Estrategia de Lanzamiento

1. **Piloto con 2-3 universidades**: Uninorte + Uniatlantico + CUC
2. **Primer reto inter-universitario**: Hackathon digital con premio
3. **Presentar metricas al resto**: "X proyectos creados, Y equipos formados"
4. **Efecto red**: Estudiantes de otras universidades piden unirse
