"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  Baby,
  BarChart3,
  Calendar,
  CloudRain,
  FileText,
  HeartPulse,
  MapPin,
  ShieldCheck,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { ChartPoint, DashboardPlan, Section, Tone } from "@/features/dashboard/lib/types";

const ICONS: Record<string, LucideIcon> = {
  activity: Activity, users: Users, heart: HeartPulse, baby: Baby,
  stethoscope: Stethoscope, alert: AlertTriangle, rain: CloudRain, map: MapPin,
  file: FileText, chart: BarChart3, calendar: Calendar, shield: ShieldCheck,
};

// Azure is the primary data color; indigo the secondary; status hues stay muted.
const TONE: Record<Tone, { icon: string; bar: string; hex: string }> = {
  emerald: { icon: "text-azure-deep", bar: "bg-azure", hex: "#00acec" },
  violet: { icon: "text-indigo", bar: "bg-indigo", hex: "#594492" },
  cyan: { icon: "text-azure-deep", bar: "bg-azure", hex: "#00acec" },
  amber: { icon: "text-caution", bar: "bg-caution", hex: "#d8922a" },
  rose: { icon: "text-critical", bar: "bg-critical", hex: "#d14343" },
};

// Square, hairline tooltip matching the card system (no default rounded box).
const TOOLTIP = {
  contentStyle: {
    borderRadius: 0,
    border: "1px solid #e2e2e2",
    boxShadow: "0 6px 20px -12px rgba(17,20,24,0.2)",
    fontSize: 12,
    padding: "8px 10px",
  },
  labelStyle: { color: "#6b7178", fontWeight: 500, marginBottom: 2 },
  itemStyle: { color: "#111418" },
} as const;

export function DynamicDashboard({ plan, lang: initial = "fr" }: { plan: DashboardPlan; lang?: Language }) {
  const [lang, setLang] = useState<Language>(initial);
  const isAgent = plan.generated_by.startsWith("openai");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-3xl text-sm leading-6 text-slate">{t(plan.description, lang)}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-muted">
            {isAgent ? "IA" : "auto"}
          </span>
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="border border-line px-2 py-1 text-xs font-medium uppercase text-slate hover:bg-mist"
          >
            {lang === "fr" ? "EN" : "FR"}
          </button>
        </div>
      </div>

      {plan.kpis.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plan.kpis.map((k, i) => {
            const tc = TONE[k.tone] ?? TONE.emerald;
            const Icon = ICONS[k.icon] ?? Activity;
            return (
              <div key={i} className="elevate relative overflow-hidden border border-line bg-paper p-5">
                <div className={`absolute inset-x-0 top-0 h-1 ${tc.bar}`} aria-hidden="true" />
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs font-medium uppercase tracking-[0.09em] text-muted">{t(k.title, lang)}</div>
                  <Icon className={`h-5 w-5 shrink-0 ${tc.icon}`} aria-hidden="true" />
                </div>
                <div className="mt-3 font-mono text-4xl font-light tabular-nums tracking-tight text-ink">{k.value}</div>
                <div className="mt-1 text-sm text-muted">{t(k.helper, lang)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {plan.sections.map((s, i) => (
          <section key={i} className="elevate border border-line bg-paper">
            <div className="tint-band border-b border-line p-4">
              <h3 className="flex items-center gap-2 text-lg font-normal tracking-tight text-ink">
                <span className="h-4 w-0.5 bg-azure" aria-hidden="true" />
                {t(s.title, lang)}
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted">{t(s.insight, lang)}</p>
            </div>
            <div className="p-4">{renderChart(s)}</div>
          </section>
        ))}
      </div>
    </div>
  );
}

function renderChart(s: Section) {
  const data = (s.data as ChartPoint[]) ?? [];
  const hex = (TONE[s.tone] ?? TONE.emerald).hex;
  if (!data.length) return <p className="text-sm text-muted">—</p>;

  if (s.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#e2e2e2" vertical={false} />
          <XAxis dataKey="label" fontSize={12} stroke="#6b7178" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#6b7178" tickLine={false} axisLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP.contentStyle}
            labelStyle={TOOLTIP.labelStyle}
            itemStyle={TOOLTIP.itemStyle}
            cursor={{ stroke: "#cbd5dd", strokeWidth: 1 }}
          />
          <Line type="monotone" dataKey="value" stroke={hex} strokeWidth={2} dot={{ r: 3, fill: hex }} activeDot={{ r: 5, fill: hex }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const height = Math.max(180, data.length * 38 + 20);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="#e2e2e2" horizontal={false} />
        <XAxis type="number" fontSize={12} stroke="#6b7178" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={130} fontSize={12} stroke="#6b7178" tickLine={false} axisLine={false} />
        <Tooltip
          contentStyle={TOOLTIP.contentStyle}
          labelStyle={TOOLTIP.labelStyle}
          itemStyle={TOOLTIP.itemStyle}
          cursor={{ fill: "#f4f4f4" }}
        />
        <Bar dataKey="value" fill={hex} radius={[0, 0, 0, 0]} barSize={20}>
          <LabelList dataKey="value" position="right" fontSize={11} fill="#6b7178" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
