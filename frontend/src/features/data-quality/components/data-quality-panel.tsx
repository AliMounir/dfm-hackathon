"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/data-quality/lib/types";

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-critical-wash text-critical",
  medium: "bg-caution-wash text-caution",
  low: "bg-mist text-muted",
};

// Colored left rail per severity — adds depth and meaning at a glance.
const SEVERITY_RAIL: Record<string, string> = {
  high: "border-l-critical",
  medium: "border-l-caution",
  low: "border-l-muted",
};

const SEVERITY_DOT: Record<string, string> = {
  high: "bg-critical",
  medium: "bg-caution",
  low: "bg-muted",
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
      <header className="flex items-end justify-between">
        <div>
          <span className="eyebrow mb-2">{lang === "fr" ? "Contrôle qualité" : "Quality control"}</span>
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

      <div className="grid gap-3">
        {project.qualityIssues.map((issue) => (
          <Card key={issue.id} className={`border-l-2 ${SEVERITY_RAIL[issue.severity]}`}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[issue.severity]}`} aria-hidden="true" />
                  {t(issue.title, lang)}
                </span>
                <Badge className={`${SEVERITY_STYLE[issue.severity]} font-medium`}>
                  {issue.severity} · {issue.count}
                </Badge>
              </CardTitle>
              <CardDescription>{t(issue.whyItMatters, lang)}</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate">
              <span className="font-medium">{lang === "fr" ? "Action : " : "Action: "}</span>
              {t(issue.action, lang)}
            </CardContent>
          </Card>
        ))}
        {project.qualityIssues.length === 0 && (
          <p className="text-sm text-muted">
            {lang === "fr" ? "Aucun problème détecté (démo)." : "No issues detected (demo)."}
          </p>
        )}
      </div>
    </section>
  );
}
