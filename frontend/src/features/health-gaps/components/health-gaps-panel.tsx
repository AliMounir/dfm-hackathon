"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/health-gaps/lib/types";

const HEADING: Record<Language, string> = {
  fr: "Lacunes & risques de santé",
  en: "Healthcare gaps & risks",
};

/**
 * Function 2 — utilisation trends vs. target and seasonal risk windows.
 * TODO(DfM): swap the tables for charts (recharts) and join climate/seasonality.
 */
export function HealthGapsPanel({ project, lang: initial = "fr" }: { project: Project; lang?: Language }) {
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {lang === "fr" ? "Activité mensuelle vs cible" : "Monthly activity vs target"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-neutral-500">
                <tr>
                  <th className="py-1">{lang === "fr" ? "Mois" : "Month"}</th>
                  <th>{lang === "fr" ? "Services" : "Services"}</th>
                  <th>{lang === "fr" ? "Risques" : "Risks"}</th>
                  <th>{lang === "fr" ? "Cible" : "Target"}</th>
                </tr>
              </thead>
              <tbody>
                {project.monthly.map((m) => (
                  <tr key={m.month} className="border-t">
                    <td className="py-1">{m.month}</td>
                    <td className={m.services < m.target ? "text-rose-600" : "text-emerald-600"}>
                      {m.services}
                    </td>
                    <td>{m.risks}</td>
                    <td className="text-neutral-500">{m.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{lang === "fr" ? "Par site" : "By site"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {project.sites.map((s) => (
              <div key={s.site} className="flex items-center justify-between text-sm">
                <span>{s.site}</span>
                <span className="flex items-center gap-2">
                  <span className="font-medium">{s.value}</span>
                  <Badge className={s.change < 0 ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}>
                    {s.change > 0 ? "+" : ""}
                    {s.change}%
                  </Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {project.insights.map((i) => (
          <Card key={i.id}>
            <CardHeader>
              <CardTitle className="text-base">{t(i.title, lang)}</CardTitle>
              <CardDescription>
                <Badge className="bg-cyan-100 text-cyan-700">{t(i.tag, lang)}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-neutral-700">{t(i.body, lang)}</CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
