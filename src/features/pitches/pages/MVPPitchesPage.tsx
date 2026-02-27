import React, { useState } from "react";
import { getCopy, getNestedCopy } from "@/shared/branding/copy";
import { cn } from "@/shared/branding/tokens";

const demoPitches = [
  {
    id: "p1",
    title: "CampusFlow — Gestión inteligente de trámites universitarios",
    author: "Laura Martínez",
    university: "Universidad del Norte",
    videoUrl: "/demo/campusflow.mp4",
    thumbnailUrl: "/demo/campusflow-thumb.jpg",
    duration: "2:45",
    views: 142,
    category: "Tracción",
  },
  {
    id: "p2",
    title: "SENA SkillMatch — Matching de talento para retos reales",
    author: "Andrés Rojas",
    university: "SENA",
    videoUrl: "/demo/skillmatch.mp4",
    thumbnailUrl: "/demo/skillmatch-thumb.jpg",
    duration: "3:12",
    views: 89,
    category: "Solución",
  },
  {
    id: "p3",
    title: "ReformaConnect — Red de colaboración académica",
    author: "Camila Vargas",
    university: "Universidad Reformada",
    videoUrl: "/demo/reformaconnect.mp4",
    thumbnailUrl: "/demo/reformaconnect-thumb.jpg",
    duration: "4:01",
    views: 231,
    category: "Equipo",
  },
];

export default function MVPPitchesPage() {
  const [selectedPitch, setSelectedPitch] = useState<typeof demoPitches[0] | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const openPitch = (pitch: typeof demoPitches[0]) => {
    setSelectedPitch(pitch);
    setIsPlaying(false);
  };

  const closePitch = () => {
    setSelectedPitch(null);
    setIsPlaying(false);
  };

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
              HIDEON / Pitches
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400">
              {getNestedCopy("actions", "publish")}
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative z-10 mx-auto w-full max-w-6xl px-5 py-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Pitches de Innovación
            </h1>
            <p className="mt-4 text-base text-slate-300">
              Formato presentación: señal &gt; estética social. Sin distracciones. 
              Enfocado en problema, solución, métricas y roadmap.
            </p>
          </div>
        </section>

        {/* Grid de Pitches */}
        <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-16">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-slate-100">
              {demoPitches.length} Pitches disponibles
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {demoPitches.map((pitch) => (
              <article
                key={pitch.id}
                onClick={() => openPitch(pitch)}
                className="group cursor-pointer rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur transition hover:bg-slate-900/50"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden rounded-t-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full border-2 border-slate-600 bg-slate-900/50 p-4 backdrop-blur">
                      <div className="h-0 w-0 border-l-[12px] border-l-slate-100 border-y-[8px] border-y-transparent" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs text-slate-200 backdrop-blur">
                    {pitch.duration}
                  </div>
                  <div className="absolute top-2 left-2 rounded-full bg-slate-950/70 px-2 py-1 text-xs text-slate-200 backdrop-blur">
                    {pitch.category}
                  </div>
                </div>

                {/* Info */}
                <div className="p-5">
                  <h3 className="truncate text-base font-semibold text-slate-100 group-hover:text-blue-400">
                    {pitch.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {pitch.author}
                    <span className="text-slate-500"> · </span>
                    <span className="inline-flex items-center gap-2">
                      <span className="rounded-full border border-slate-700 bg-slate-950/30 px-2.5 py-0.5 text-xs text-slate-200">
                        {pitch.university}
                      </span>
                    </span>
                  </p>
                  <div className="mt-2 text-xs text-slate-400">
                    {pitch.views} vistas
                  </div>
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* Modal de Pitch Viewer */}
        {selectedPitch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl mx-4">
              {/* Header del modal */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="text-slate-100">
                  <h3 className="font-semibold">{selectedPitch.title}</h3>
                  <p className="text-sm text-slate-300">
                    {selectedPitch.author} · {selectedPitch.university}
                  </p>
                </div>
                <button
                  onClick={closePitch}
                  className="rounded-full border border-slate-700 bg-slate-900/50 p-2 text-slate-200 backdrop-blur hover:bg-slate-900/70"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Video Player (placeholder) */}
              <div className="relative aspect-video bg-black rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mb-4">
                      <div className="inline-flex items-center justify-center rounded-full border-2 border-slate-600 bg-slate-900/50 p-6 backdrop-blur">
                        <div className="h-0 w-0 border-l-[20px] border-l-slate-100 border-y-[12px] border-y-transparent" />
                      </div>
                    </div>
                    <p className="text-slate-300 mb-2">Video Player Placeholder</p>
                    <p className="text-sm text-slate-400">
                      {selectedPitch.duration} · {selectedPitch.views} vistas
                    </p>
                  </div>
                </div>

                {/* Controles del player (minimalista) */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="rounded-full border border-slate-700 bg-slate-900/50 px-3 py-1 backdrop-blur hover:bg-slate-900/70"
                    >
                      {isPlaying ? "Pausar" : "Reproducir"}
                    </button>
                    <div className="flex items-center gap-2">
                      <span>0:00</span>
                      <div className="h-1 w-32 rounded-full bg-slate-700">
                        <div className="h-1 w-1/3 rounded-full bg-blue-500" />
                      </div>
                      <span>{selectedPitch.duration}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer del modal (info adicional) */}
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4 backdrop-blur">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 mb-1">Problema</h4>
                    <p className="text-sm text-slate-300">
                      Descripción del problema que el MVP resuelve.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 mb-1">Solución</h4>
                    <p className="text-sm text-slate-300">
                      Propuesta de valor y diferenciadores clave.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-100 mb-1">Tracción</h4>
                    <p className="text-sm text-slate-300">
                      Métricas, usuarios activos y validación.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
