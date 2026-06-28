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

const TONE: Record<Tone, { card: string; label: string; value: string; helper: string; icon: string; hex: string }> = {
  emerald: { card: "border-emerald-200 bg-emerald-50", label: "text-emerald-900", value: "text-emerald-950", helper: "text-emerald-700/70", icon: "text-emerald-700", hex: "#059669" },
  violet: { card: "border-violet-200 bg-violet-50", label: "text-violet-900", value: "text-violet-800", helper: "text-violet-700/70", icon: "text-violet-700", hex: "#7c3aed" },
  cyan: { card: "border-cyan-200 bg-cyan-50", label: "text-cyan-900", value: "text-cyan-900", helper: "text-cyan-700/70", icon: "text-cyan-700", hex: "#0891b2" },
  amber: { card: "border-amber-200 bg-amber-50", label: "text-amber-900", value: "text-amber-900", helper: "text-amber-700/80", icon: "text-amber-700", hex: "#d97706" },
  rose: { card: "border-rose-200 bg-rose-50", label: "text-rose-900", value: "text-rose-900", helper: "text-rose-700/70", icon: "text-rose-700", hex: "#e11d48" },
};

export function DynamicDashboard({ plan, lang: initial = "fr" }: { plan: DashboardPlan; lang?: Language }) {
  const [lang, setLang] = useState<Language>(initial);
  const isAgent = plan.generated_by.startsWith("openai");

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <p className="max-w-3xl text-sm leading-6 text-stone-700">{t(plan.description, lang)}</p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500">
            {isAgent ? "IA" : "auto"}
          </span>
          <button
            onClick={() => setLang(lang === "fr" ? "en" : "fr")}
            className="rounded-md border border-stone-200 px-2 py-1 text-xs font-medium uppercase text-stone-600 hover:bg-stone-50"
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
              <div key={i} className={`relative overflow-hidden rounded-xl border p-5 ${tc.card}`}>
                <div className="absolute right-4 top-4 rounded-lg bg-white/90 p-2 shadow-sm">
                  <Icon className={`h-5 w-5 ${tc.icon}`} aria-hidden="true" />
                </div>
                <div className={`pr-12 text-sm font-semibold ${tc.label}`}>{t(k.title, lang)}</div>
                <div className={`mt-1 text-3xl font-bold tracking-tight ${tc.value}`}>{k.value}</div>
                <div className={`mt-1 text-sm ${tc.helper}`}>{t(k.helper, lang)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {plan.sections.map((s, i) => (
          <section key={i} className="rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-100 p-4">
              <h3 className="text-base font-semibold text-stone-950">{t(s.title, lang)}</h3>
              <p className="mt-0.5 text-sm leading-6 text-stone-600">{t(s.insight, lang)}</p>
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
  if (!data.length) return <p className="text-sm text-stone-400">—</p>;

  if (s.type === "line") {
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="#e7e5e4" vertical={false} />
          <XAxis dataKey="label" fontSize={12} stroke="#a8a29e" tickLine={false} axisLine={false} />
          <YAxis fontSize={12} stroke="#a8a29e" tickLine={false} axisLine={false} width={44} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke={hex} strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  const height = Math.max(180, data.length * 38 + 20);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
        <CartesianGrid stroke="#e7e5e4" horizontal={false} />
        <XAxis type="number" fontSize={12} stroke="#a8a29e" tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={130} fontSize={12} stroke="#57534e" tickLine={false} axisLine={false} />
        <Tooltip cursor={{ fill: "#f5f5f4" }} />
        <Bar dataKey="value" fill={hex} radius={[0, 4, 4, 0]} barSize={20}>
          <LabelList dataKey="value" position="right" fontSize={11} fill="#57534e" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
