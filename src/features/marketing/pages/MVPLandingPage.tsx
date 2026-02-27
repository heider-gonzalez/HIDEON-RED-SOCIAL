import React from "react";
import { Link } from "react-router-dom";
import { ProjectCard, type ProjectCardData } from "@/features/projects/components/ProjectCard";
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
];

export default function MVPLandingPage() {
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
              HIDEON / MVPs & Talento
            </span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <Link className="text-sm text-slate-300 hover:text-slate-100" to="/mvp/dashboard">
              {getNestedCopy("nav", "dashboard")}
            </Link>
            <Link className="text-sm text-slate-300 hover:text-slate-100" to="/mvp/pitches">
              {getNestedCopy("nav", "pitches")}
            </Link>
            <Link className="text-sm text-slate-300 hover:text-slate-100" to="/explore">
              {getNestedCopy("nav", "explore")}
            </Link>
            <Link className="text-sm text-slate-300 hover:text-slate-100" to="/profile">
              {getNestedCopy("nav", "profile")}
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-200 backdrop-blur hover:bg-slate-900/70"
            >
              Ingresar
            </Link>
            <Link
              to="/mvp/dashboard"
              className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400"
            >
              {getNestedCopy("actions", "publish")}
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16 pt-10">
          <section className="grid gap-10 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 text-xs text-slate-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-blue-400" />
                Plataforma profesional para MVPs universitarios
              </div>

              <h1 className="mt-5 text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                Exhibe tu MVP. Valida tu tracción. Construye una red de colaboración.
              </h1>

              <p className="mt-4 max-w-xl text-pretty text-base text-slate-300">
                Un espacio tipo “tech-academy” donde estudiantes, docentes y profesionales
                descubren MVPs reales, revisan pitches y avalan talento con señales claras.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/mvp/dashboard"
                  className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-blue-400"
                >
                  Explorar MVPs
                </Link>
                <button className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-3 text-sm text-slate-200 backdrop-blur hover:bg-slate-900/60">
                  Ver estándares de publicación
                </button>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-3 text-xs text-slate-300">
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 backdrop-blur">
                  <div className="text-slate-100 font-semibold">Universidad</div>
                  <div className="mt-1">Segmentación y comunidad</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 backdrop-blur">
                  <div className="text-slate-100 font-semibold">Madurez MVP</div>
                  <div className="mt-1">Señales claras de progreso</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-3 backdrop-blur">
                  <div className="text-slate-100 font-semibold">Avales</div>
                  <div className="mt-1">Prestigio y ranking</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 backdrop-blur">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-100">MVPs destacados</div>
                <div className="text-xs text-slate-400">Actualizado hoy</div>
              </div>

              <div className="grid gap-4">
                {demoProjects.map((p) => (
                  <ProjectCard key={p.id} project={p} />
                ))}
              </div>
            </div>
          </section>

          {/* Pitches Section */}
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-100">{getNestedCopy("nav", "pitches")}</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Formato presentación: señal &gt; estética social. Sin distracciones.
                </p>
              </div>
              <Link
                to="/mvp/pitches"
                className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200 backdrop-blur hover:bg-slate-900/60"
              >
                Ver Pitches
              </Link>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {["Tracción", "Solución", "Equipo"].map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 backdrop-blur"
                >
                  <div className="text-sm font-semibold text-slate-100">{label}</div>
                  <div className="mt-2 text-sm text-slate-300">
                    Plantilla de pitch orientada a startups: problema, solución, métricas, roadmap.
                  </div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
