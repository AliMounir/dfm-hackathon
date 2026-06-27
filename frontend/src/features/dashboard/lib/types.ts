import type { LocalizedText } from "@/lib/projects";

export type { Project, Language, LocalizedText } from "@/lib/projects";

// Mirrors backend/app/domains/dashboard/schemas.py
export type WidgetType =
  | "metric_cards"
  | "utilisation_trend"
  | "risk_trend"
  | "site_comparison"
  | "quality_issues"
  | "insight_cards"
  | "impact_story"
  | "seasonal_risk"
  | "suggested_questions";

export type WidgetSpec = {
  type: WidgetType;
  title: LocalizedText;
  data_key: string;
  priority: number;
  rationale: LocalizedText;
  config?: Record<string, unknown>;
};

export type DashboardPlan = {
  project_id: string;
  summary: LocalizedText;
  widgets: WidgetSpec[];
  generated_by: string;
};
