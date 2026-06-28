import type { LocalizedText } from "@/lib/projects";

export type { Project, Language, LocalizedText } from "@/lib/projects";

export type Tone = "emerald" | "violet" | "cyan" | "amber" | "rose";

export type KpiCard = {
  tone: Tone;
  icon: string;
  title: LocalizedText;
  value: string;
  helper: LocalizedText;
};

export type ChartPoint = { label: string; value: number };

export type Section = {
  tone: Tone;
  type: "bar" | "line";
  title: LocalizedText;
  insight: LocalizedText;
  data: ChartPoint[];
};

export type DashboardPlan = {
  project_id: string;
  description: LocalizedText;
  kpis: KpiCard[];
  sections: Section[];
  generated_by: string;
};
