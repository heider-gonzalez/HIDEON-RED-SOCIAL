import React, { useState } from "react";
import { ProjectCard, type ProjectCardData } from "@/features/projects/components/ProjectCard";
import { InstitutionCombobox } from "@/components/filters/InstitutionCombobox";
import { getCopy, getNestedCopy } from "@/shared/branding/copy";
import { cn } from "@/shared/branding/tokens";

const demoProjects: ProjectCardData[] = [
  {
    id: "p1",
    title: "CampusFlow — Gestión inteligente de trámites universitarios",
    authorName: "Laura Martínez",
    university: "Universidad del Norte",
    technologies: ["React", "Supabase", "Tailwind"],
    maturity: "mvp_functional",
    updatedAt: "Hace 2 días",
    pitchLabel: "Pitch disponible",
  },
  {
    id: "p2",
    title: "SENA SkillMatch — Matching de talento para retos reales",
    authorName: "Andrés Rojas",
    university: "SENA",
    technologies: ["Next.js", "Postgres", "RLS"],
    maturity: "in_development",
    updatedAt: "Hace 6 días",
    pitchLabel: "Pitch en preparación",
  },
  {
    id: "p3",
    title: "ReformaConnect — Red de colaboración académica",
    authorName: "Camila Vargas",
    university: "Universidad Reformada",
    technologies: ["Node.js", "Socket.io", "Postgres"],
    maturity: "scalable",
    updatedAt: "Hace 1 semana",
    pitchLabel: "Pitch destacado",
  },
  {
    id: "p4",
    title: "UniTask — Organizador académico con IA",
    authorName: "Diego Fuentes",
    university: "Universidad Autónoma del Caribe",
    technologies: ["Python", "FastAPI", "React"],
    maturity: "mvp_functional",
    updatedAt: "Hace 3 días",
    pitchLabel: "Pitch disponible",
  },
];

const faculties = [
  getNestedCopy("faculties", "engineering"),
  getNestedCopy("faculties", "design"),
  getNestedCopy("faculties", "business"),
  getNestedCopy("faculties", "health"),
  getNestedCopy("faculties", "education"),
  getNestedCopy("faculties", "communication"),
  getNestedCopy("faculties", "law"),
  getNestedCopy("faculties", "architecture"),
  getNestedCopy("faculties", "other"),
];

const mvpStatuses = [
  { value: "all", label: "Todos" },
  { value: "in_development", label: getNestedCopy("mvpStatus", "in_development") },
  { value: "mvp_functional", label: getNestedCopy("mvpStatus", "mvp_functional") },
  { value: "scalable", label: getNestedCopy("mvpStatus", "scalable") },
];

export default function MVPDashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [faculty, setFaculty] = useState("all");
  const [status, setStatus] = useState("all");

  const filteredProjects = demoProjects.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.authorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.technologies.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesInstitution = !institutionName || p.university === institutionName;
    const matchesFaculty = faculty === "all" || p.university.includes(faculty);
    const matchesStatus = status === "all" || p.maturity === status;
    return matchesSearch && matchesInstitution && matchesFaculty && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100">
      <div className="relative">
        {/* Efectos de fondo */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute top-24 right-0 h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
        </div>

        {/* Header */}
        <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border border-slate-800 bg-slate-900/60 backdrop-blur" />
            <span className="text-sm font-semibold tracking-wide text-slate-100">
              HIDEON / Dashboard
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400">
              {getNestedCopy("actions", "publish")}
            </button>
          </div>
        </header>

        {/* Filtros */}
        <section className="relative z-10 mx-auto w-full max-w-6xl px-5 py-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 backdrop-blur">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">Filtros</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Búsqueda */}
              <div className="md:col-span-2 lg:col-span-1">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  {getNestedCopy("placeholders", "search")}
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={getNestedCopy("placeholders", "search")}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 backdrop-blur focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Universidad */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  {getNestedCopy("placeholders", "institution")}
                </label>
                <InstitutionCombobox value={institutionName} onChange={setInstitutionName} />
              </div>

              {/* Facultad */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  {getNestedCopy("placeholders", "faculty")}
                </label>
                <select
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 backdrop-blur focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">Todas</option>
                  {faculties.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              {/* Estado MVP */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  {getNestedCopy("placeholders", "status")}
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/30 px-4 py-2 text-sm text-slate-100 placeholder:text-slate-400 backdrop-blur focus:border-blue-500 focus:outline-none"
                >
                  {mvpStatuses.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Grid de MVPs */}
        <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-100">
              {filteredProjects.length} MVP{filteredProjects.length !== 1 ? "s" : ""} encontrados
            </h2>
            <div className="text-sm text-slate-400">
              {institutionName && `Universidad: ${institutionName} · `}
              {faculty !== "all" && `Facultad: ${faculty} · `}
              {status !== "all" && `Estado: ${mvpStatuses.find(s => s.value === status)?.label}`}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProjects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="mt-16 text-center">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold text-slate-100 mb-2">
                No se encontraron MVPs
              </h3>
              <p className="text-slate-300">
                Intenta ajustar tus filtros de búsqueda
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
