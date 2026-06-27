"use client";

import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { DashboardPlan, WidgetSpec } from "@/features/dashboard/lib/types";
import type { Project } from "@/lib/projects";

const SEVERITY: Record<string, string> = {
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-neutral-100 text-neutral-600",
};

/** Renders the agent-composed plan: widgets in priority order, each with the
 *  agent's rationale for why it was chosen. */
export function DynamicDashboard({
  project,
  plan,
  lang: initial = "fr",
}: {
  project: Project;
  plan: DashboardPlan;
  lang?: Language;
}) {
  const [lang, setLang] = useState<Language>(initial);
  const widgets = [...plan.widgets].sort((a, b) => a.priority - b.priority);

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t(plan.summary, lang)}</h2>
          <p className="text-xs text-neutral-400">
            {lang === "fr" ? "Composé par" : "Composed by"}: {plan.generated_by}
          </p>
        </div>
        <button
          onClick={() => setLang(lang === "fr" ? "en" : "fr")}
          className="rounded-md border px-2 py-1 text-xs uppercase"
        >
          {lang === "fr" ? "EN" : "FR"}
        </button>
      </header>

      {widgets.map((w, i) => (
        <Card key={`${w.type}-${i}`}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              {t(w.title, lang)}
              <Badge className="bg-neutral-100 text-neutral-500">#{w.priority}</Badge>
            </CardTitle>
            <CardDescription>
              {lang === "fr" ? "Pourquoi : " : "Why: "}
              {t(w.rationale, lang)}
            </CardDescription>
          </CardHeader>
          <CardContent>{renderWidget(w, project, lang)}</CardContent>
        </Card>
      ))}
    </section>
  );
}

function renderWidget(w: WidgetSpec, project: Project, lang: Language) {
  switch (w.type) {
    case "metric_cards":
      return (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {project.metrics.map((m) => (
            <div key={m.id} className="rounded-lg border p-3">
              <div className="text-xs text-neutral-500">{t(m.label, lang)}</div>
              <div className="text-xl font-semibold">{m.value}</div>
            </div>
          ))}
        </div>
      );

    case "utilisation_trend":
      return (
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={project.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="services" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line dataKey="target" stroke="#6366f1" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      );

    case "risk_trend":
      return (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={project.monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="month" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Line dataKey="risks" stroke="#f43f5e" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );

    case "site_comparison":
      return (
        <div className="space-y-2">
          {project.sites.map((s) => (
            <div key={s.site} className="flex items-center justify-between text-sm">
              <span>{s.site}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium">{s.value}</span>
                <Badge className={s.change < 0 ? SEVERITY.high : "bg-emerald-100 text-emerald-700"}>
                  {s.change > 0 ? "+" : ""}
                  {s.change}%
                </Badge>
              </span>
            </div>
          ))}
        </div>
      );

    case "quality_issues":
      return (
        <div className="space-y-2">
          {project.qualityIssues.map((q) => (
            <div key={q.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t(q.title, lang)}</span>
                <Badge className={SEVERITY[q.severity]}>
                  {q.severity} · {q.count}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-neutral-600">{t(q.whyItMatters, lang)}</p>
            </div>
          ))}
        </div>
      );

    case "insight_cards":
      return (
        <div className="grid gap-2 md:grid-cols-2">
          {project.insights.map((ins) => (
            <div key={ins.id} className="rounded-lg border p-3">
              <Badge className="bg-violet-100 text-violet-700">{t(ins.tag, lang)}</Badge>
              <div className="mt-1 text-sm font-medium">{t(ins.title, lang)}</div>
              <p className="text-xs text-neutral-600">{t(ins.body, lang)}</p>
            </div>
          ))}
        </div>
      );

    case "impact_story":
      return <p className="text-sm leading-relaxed text-neutral-700">{t(project.story, lang)}</p>;

    case "seasonal_risk": {
      const month = (w.config?.highlight_month as string) ?? "";
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {lang === "fr"
            ? `Fenêtre de risque saisonnier à surveiller${month ? ` autour de ${month}` : ""}.`
            : `Seasonal risk window to watch${month ? ` around ${month}` : ""}.`}
        </div>
      );
    }

    case "suggested_questions":
      return (
        <div className="flex flex-wrap gap-1.5">
          {project.suggestedQuestions.map((q, idx) => (
            <span key={idx} className="rounded-full border px-3 py-1 text-xs text-neutral-600">
              {t(q, lang)}
            </span>
          ))}
        </div>
      );

    default:
      return null;
  }
}
