// Re-export the canonical project types so feature code imports from the
// feature, not the global lib. The source of truth stays in @/lib/projects.
export type {
  Project,
  Metric,
  MetricTone,
  QualityIssue,
  Insight,
  MonthlyPoint,
  SitePoint,
  LocalizedText,
  Language,
} from "@/lib/projects";
