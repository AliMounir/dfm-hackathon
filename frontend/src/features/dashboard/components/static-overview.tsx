"use client";

import { useEffect, useState } from "react";
import { Database, FileText, LayoutDashboard, type LucideIcon } from "lucide-react";

import { getOverview, type Overview } from "@/features/dashboard/api/overview";
import type { Language } from "@/features/shared/lib/i18n";

const TONE: Record<string, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
};

function OvCard({ tone, icon: Icon, label, value }: { tone: string; icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 ${TONE[tone]}`}>
      <div className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 shadow-sm">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{value}</div>
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

  if (state === "loading") return <p className="text-sm text-stone-500">…</p>;
  if (state === "error" || !data)
    return (
      <p className="text-sm text-stone-500">
        {tr("Vue d'ensemble temporairement indisponible.", "Overview temporarily unavailable.")}
      </p>
    );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-950">{tr("Vue d'ensemble", "Overview")}</h2>
        <p className="text-sm leading-6 text-stone-600">
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
            className="rounded-xl border border-stone-200 bg-white p-4 text-left transition hover:border-emerald-300 hover:shadow-sm"
          >
            <div className="text-sm font-semibold text-stone-900">{p.name}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
              <span>{p.files} {tr("fichiers", "files")}</span>
              <span>·</span>
              <span>{p.records.toLocaleString()} {tr("enreg.", "records")}</span>
            </div>
            <div className="mt-2 text-xs font-medium text-emerald-700">
              {tr("Ouvrir le tableau de bord →", "Open dashboard →")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
