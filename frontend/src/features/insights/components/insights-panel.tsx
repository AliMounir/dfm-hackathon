"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/insights/lib/types";

const HEADING: Record<Language, string> = {
  fr: "Analyses & récits d'impact",
  en: "Insights & impact stories",
};

/**
 * Function 3 — headline metrics, interpretation insights, and a WHO-aligned
 * impact story for the selected audience. TODO(DfM): generate via the LLM.
 */
export function InsightsPanel({ project, lang: initial = "fr" }: { project: Project; lang?: Language }) {
  const [lang, setLang] = useState<Language>(initial);
  return (
    <section className="space-y-4">
      <header className="flex items-end justify-between">
        <div>
          <span className="eyebrow mb-2">{lang === "fr" ? "Analyses" : "Insights"}</span>
          <h2 className="text-2xl font-light tracking-tight text-ink">{HEADING[lang]}</h2>
          <p className="text-sm text-muted">{project.name}</p>
        </div>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="border border-line px-2 py-1 text-xs uppercase text-slate hover:bg-mist"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {project.metrics.map((m) => (
          <div key={m.id} className="elevate relative overflow-hidden border border-line bg-paper p-5">
            <div className="absolute inset-x-0 top-0 h-1 bg-azure" aria-hidden="true" />
            <div className="text-xs font-medium uppercase tracking-[0.09em] text-muted">{t(m.label, lang)}</div>
            <div className="mt-3 font-mono text-3xl font-light tabular-nums tracking-tight text-ink">{m.value}</div>
            <div className="mt-1 text-xs text-muted">{t(m.helper, lang)}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {project.insights.map((i) => (
          <Card key={i.id} className="border-t-2 border-t-indigo">
            <CardHeader>
              <CardTitle className="text-base">{t(i.title, lang)}</CardTitle>
              <CardDescription>
                <Badge className="bg-indigo-wash text-indigo">{t(i.tag, lang)}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate">{t(i.body, lang)}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{lang === "fr" ? "Récit d'impact" : "Impact story"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-slate">
          {t(project.story, lang)}
        </CardContent>
      </Card>
    </section>
  );
}
