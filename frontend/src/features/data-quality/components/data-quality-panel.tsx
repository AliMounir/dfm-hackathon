"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/data-quality/lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-neutral-100 text-neutral-600",
};

const HEADING: Record<Language, string> = {
  fr: "Contrôle qualité des données",
  en: "Data quality checking",
};

/**
 * Function 1 — review M&E exports, flag issues, and explain (French-first)
 * why each matters and how to correct it.
 */
export function DataQualityPanel({ project, lang: initial = "fr" }: { project: Project; lang?: Language }) {
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

      <div className="grid gap-3">
        {project.qualityIssues.map((issue) => (
          <Card key={issue.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                {t(issue.title, lang)}
                <Badge className={SEVERITY_STYLE[issue.severity]}>
                  {issue.severity} · {issue.count}
                </Badge>
              </CardTitle>
              <CardDescription>{t(issue.whyItMatters, lang)}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-neutral-700">
              <span className="font-medium">{lang === "fr" ? "Action : " : "Action: "}</span>
              {t(issue.action, lang)}
            </CardContent>
          </Card>
        ))}
        {project.qualityIssues.length === 0 && (
          <p className="text-sm text-neutral-500">
            {lang === "fr" ? "Aucun problème détecté (démo)." : "No issues detected (demo)."}
          </p>
        )}
      </div>
    </section>
  );
}
