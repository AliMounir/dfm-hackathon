"use client";

import { useEffect, useState } from "react";
import { Database, FileText, LayoutDashboard, type LucideIcon } from "lucide-react";

import { getOverview, type Overview } from "@/features/dashboard/api/overview";
import type { Language } from "@/features/shared/lib/i18n";

const TONE: Record<string, { bar: string; icon: string }> = {
  emerald: { bar: "bg-azure", icon: "text-azure-deep" },
  cyan: { bar: "bg-azure", icon: "text-azure-deep" },
  violet: { bar: "bg-indigo", icon: "text-indigo" },
};

function OvCard({ tone, icon: Icon, label, value }: { tone: string; icon: LucideIcon; label: string; value: React.ReactNode }) {
  const tc = TONE[tone] ?? TONE.emerald;
  return (
    <div className="elevate relative overflow-hidden border border-line bg-paper p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${tc.bar}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-medium uppercase tracking-[0.09em] text-muted">{label}</div>
        <Icon className={`h-5 w-5 shrink-0 ${tc.icon}`} aria-hidden="true" />
      </div>
      <div className="mt-3 font-mono text-4xl font-light tabular-nums tracking-tight text-ink">{value}</div>
    </div>
  );
}

/** Static overview shown when no project is selected — reads the real data
 *  folder (deterministic, no agent). */
export function StaticOverview({ onSelect, language = "fr" }: { onSelect: (id: string) => void; language?: Language }) {
  const [data, setData] = useState<Overview | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    getOverview().then((d) => {
      if (!alive) return;
      if (d) {
        setData(d);
        setState("ok");
      } else {
        setState("error");
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const tr = (fr: string, en: string) => (language === "fr" ? fr : en);

  if (state === "loading") return <p className="text-sm text-muted">…</p>;
  if (state === "error" || !data)
    return (
      <p className="text-sm text-muted">
        {tr("Vue d'ensemble temporairement indisponible.", "Overview temporarily unavailable.")}
      </p>
    );

  return (
    <div className="space-y-5">
      <div>
        <span className="eyebrow mb-2">{tr("Tous les projets", "All projects")}</span>
        <h2 className="text-2xl font-light tracking-tight text-ink">{tr("Vue d'ensemble", "Overview")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate">
          {tr("Aperçu statique de toutes les données disponibles.", "Static overview of all available data.")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <OvCard tone="emerald" icon={LayoutDashboard} label={tr("Projets", "Projects")} value={data.n_projects} />
        <OvCard tone="cyan" icon={FileText} label={tr("Fichiers de données", "Data files")} value={data.n_files} />
        <OvCard tone="violet" icon={Database} label={tr("Enregistrements", "Records")} value={data.n_records.toLocaleString()} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className="elevate elevate-hover group border-l-2 border-l-azure border-y border-r border-line bg-paper p-4 text-left hover:border-l-azure-deep"
          >
            <div className="text-sm font-medium text-ink">{p.name}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">
              <span>{p.files} {tr("fichiers", "files")}</span>
              <span>·</span>
              <span>{p.records.toLocaleString()} {tr("enreg.", "records")}</span>
            </div>
            <div className="mt-2 text-xs font-medium text-azure-deep">
              {tr("Ouvrir le tableau de bord →", "Open dashboard →")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
