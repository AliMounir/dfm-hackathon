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
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{HEADING[lang]}</h2>
          <p className="text-sm text-neutral-500">{project.name}</p>
        </div>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="rounded-md border px-2 py-1 text-xs uppercase"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {project.metrics.map((m) => (
          <Card key={m.id}>
            <CardHeader className="pb-2">
              <CardDescription>{t(m.label, lang)}</CardDescription>
              <CardTitle className="text-2xl">{m.value}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-500">{t(m.helper, lang)}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {project.insights.map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <CardTitle className="text-base">{t(i.title, lang)}</CardTitle>
              <CardDescription>
                <Badge className="bg-violet-100 text-violet-700">{t(i.tag, lang)}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-neutral-700">{t(i.body, lang)}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{lang === "fr" ? "Récit d'impact" : "Impact story"}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed text-neutral-700">
          {t(project.story, lang)}
        </CardContent>
      </Card>
    </section>
  );
}
