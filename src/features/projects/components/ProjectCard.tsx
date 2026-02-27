import React from "react";
import { cn } from "@/shared/branding/tokens";

export type MVPMaturity = "in_development" | "mvp_functional" | "scalable";

export type ProjectCardData = {
  id: string;
  title: string;
  authorName: string;
  university: string;
  technologies: string[];
  maturity: MVPMaturity;
  updatedAt?: string;
  pitchLabel?: string;
};

function maturityUI(maturity: MVPMaturity) {
  switch (maturity) {
    case "in_development":
      return { label: "En desarrollo", tone: "bg-slate-900/50 border-slate-700 text-slate-200", dot: "bg-amber-400" };
    case "mvp_functional":
      return { label: "MVP funcional", tone: "bg-slate-900/50 border-slate-700 text-slate-200", dot: "bg-blue-400" };
    case "scalable":
      return { label: "Escalable", tone: "bg-slate-900/50 border-slate-700 text-slate-200", dot: "bg-emerald-400" };
  }
}

function universityAccent(university: string): string {
  const key = university.toLowerCase();
  if (key.includes("norte")) return "border-blue-500/30";
  if (key.includes("cuc") || key.includes("costa")) return "border-cyan-500/30";
  if (key.includes("reformada")) return "border-violet-500/30";
  if (key.includes("sena")) return "border-emerald-500/30";
  return "border-slate-700";
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const maturity = maturityUI(project.maturity);
  const uniBorder = universityAccent(project.university);

  return (
    <article
      className={cn(
        "group rounded-2xl border bg-slate-900/35 p-5 backdrop-blur transition hover:bg-slate-900/50",
        uniBorder
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-100 md:text-lg">
            {project.title}
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {project.authorName}
            <span className="text-slate-500"> · </span>
            <span className="inline-flex items-center gap-2">
              <span className="rounded-full border border-slate-700 bg-slate-950/30 px-2.5 py-0.5 text-xs text-slate-200">
                {project.university}
              </span>
            </span>
          </p>
        </div>

        <div className="shrink-0 rounded-full border px-3 py-1 text-xs backdrop-blur">
          <div className={cn("inline-flex items-center gap-2", maturity.tone)}>
            <span className={cn("h-2 w-2 rounded-full", maturity.dot)} />
            <span className="whitespace-nowrap">{maturity.label}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {project.technologies.slice(0, 6).map((t) => (
          <span
            key={t}
            className="rounded-full border border-slate-800 bg-slate-950/30 px-2.5 py-1 text-xs text-slate-200"
          >
            {t}
          </span>
        ))}
        {project.technologies.length > 6 && (
          <span className="rounded-full border border-slate-800 bg-slate-950/30 px-2.5 py-1 text-xs text-slate-400">
            +{project.technologies.length - 6}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
        <span>{project.updatedAt ?? "Actualizado recientemente"}</span>
        <span className="text-slate-300">{project.pitchLabel ?? "Pitch: N/A"}</span>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
        <button className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-blue-400 sm:px-5">
          Ver MVP
        </button>
        <button className="rounded-xl border border-slate-800 bg-slate-900/30 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900/50 sm:px-5">
          Solicitar colaboración
        </button>
      </div>
    </article>
  );
}
