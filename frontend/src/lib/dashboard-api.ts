import {
  overviewMetrics,
  overviewMonthly,
  projects,
  type Metric,
  type Project,
  type ProjectSection,
} from "@/lib/projects";

import type { ChatResponse, DashboardPlan, KpiCard, Section } from "@/features/dashboard/lib/types";

export type OverviewProject = { id: string; name: string; files: number; records: number };
export type Overview = {
  n_projects: number;
  n_files: number;
  n_records: number;
  projects: OverviewProject[];
};

export function findProject(projectId: string): Project | undefined {
  return projects.find((project) => project.id === projectId);
}

export function createOverview(): Overview {
  const projectRows = projects.map((project) => {
    const files = countUniqueFiles(project.sections);
    const records = project.monthly.reduce((sum, point) => sum + point.services, 0);

    return {
      id: project.id,
      name: project.name,
      files,
      records,
    };
  });

  return {
    n_projects: projects.length,
    n_files: projectRows.reduce((sum, project) => sum + project.files, 0),
    n_records: projectRows.reduce((sum, project) => sum + project.records, 0),
    projects: projectRows,
  };
}

export function createDashboardPlan(project: Project): DashboardPlan {
  const issueTotal = project.qualityIssues.reduce((sum, issue) => sum + issue.count, 0);

  return {
    project_id: project.id,
    description: project.story,
    generated_by: "next-api",
    kpis: project.metrics.map(metricToKpi),
    sections: [
      {
        id: "activity-trend",
        tone: project.accent,
        type: "line",
        title: { fr: "Tendance d'activite", en: "Activity trend" },
        insight: {
          fr: "Compare les volumes mensuels avec la cible pour reperer les hausses, baisses ou ruptures a expliquer.",
          en: "Compares monthly volume with target to spot increases, drops, or breaks that need explanation.",
        },
        data: project.monthly.map((point) => ({ label: point.month, value: point.services })),
      },
      {
        id: "site-comparison",
        tone: "cyan",
        type: "bar",
        title: { fr: "Comparaison par site", en: "Site comparison" },
        insight: {
          fr: "Met en evidence les sites ou l'activite est la plus forte ou demande une verification terrain.",
          en: "Highlights sites where activity is strongest or needs field-team review.",
        },
        data: project.sites.map((site) => ({ label: site.site, value: site.value })),
      },
      {
        id: "quality-alerts",
        tone: issueTotal > 50 ? "amber" : "emerald",
        type: "bar",
        title: { fr: "Alertes qualite", en: "Quality alerts" },
        insight: {
          fr: "Resume les controles prioritaires avant de valider les chiffres pour le reporting.",
          en: "Summarizes priority checks before validating figures for reporting.",
        },
        data: project.qualityIssues.map((issue) => ({
          label: issue.title.fr,
          value: issue.count,
        })),
      },
    ],
  };
}

export function createOverviewDashboardPlan(): DashboardPlan {
  return {
    project_id: "overview",
    description: {
      fr: "Vue transversale des projets DFM pour suivre l'activite, la qualite des donnees et les priorites de reporting.",
      en: "Cross-project DFM view for tracking activity, data quality, and reporting priorities.",
    },
    generated_by: "next-api",
    kpis: overviewMetrics.map(metricToKpi),
    sections: [
      {
        id: "portfolio-trend",
        tone: "emerald",
        type: "line",
        title: { fr: "Activite du portefeuille", en: "Portfolio activity" },
        insight: {
          fr: "Vue combinee des volumes mensuels pour identifier les periodes de croissance ou de tension.",
          en: "Combined monthly view to identify periods of growth or pressure.",
        },
        data: overviewMonthly.map((point) => ({ label: point.month, value: point.services })),
      },
      {
        id: "project-records",
        tone: "cyan",
        type: "bar",
        title: { fr: "Volume estime par projet", en: "Estimated volume by project" },
        insight: {
          fr: "Aide a prioriser les projets ou l'assistant peut creer le plus vite de la valeur.",
          en: "Helps prioritize where the assistant can create value fastest.",
        },
        data: createOverview().projects.map((project) => ({
          label: project.name,
          value: project.records,
        })),
      },
    ],
  };
}

export function createChatResponse(project: Project, message: string): ChatResponse {
  const lowerMessage = message.toLowerCase();
  const wantsQuality =
    lowerMessage.includes("qualite") ||
    lowerMessage.includes("quality") ||
    lowerMessage.includes("missing") ||
    lowerMessage.includes("manquant");
  const wantsSites =
    lowerMessage.includes("site") ||
    lowerMessage.includes("csb") ||
    lowerMessage.includes("zone") ||
    lowerMessage.includes("area");
  const plan = createDashboardPlan(project);
  const requestedChart = wantsQuality
    ? findSection(plan.sections, "quality-alerts")
    : wantsSites
      ? findSection(plan.sections, "site-comparison")
      : undefined;

  return {
    reply: {
      fr: buildFrenchReply(project, wantsQuality, wantsSites),
      en: buildEnglishReply(project, wantsQuality, wantsSites),
    },
    add_charts: requestedChart ? [requestedChart] : [],
    add_kpis: [],
    remove_ids: [],
    generated_by: "next-api",
  };
}

function metricToKpi(metric: Metric): KpiCard {
  return {
    id: metric.id,
    tone: metric.tone,
    icon: getMetricIcon(metric.id),
    title: metric.label,
    value: metric.value,
    helper: metric.helper,
  };
}

function getMetricIcon(metricId: string): string {
  if (metricId.includes("beneficiar") || metricId.includes("coverage")) return "users";
  if (metricId.includes("complicated") || metricId.includes("gap") || metricId.includes("alert")) {
    return "alert";
  }
  if (metricId.includes("scan") || metricId.includes("ultrasound")) return "stethoscope";
  if (metricId.includes("source") || metricId.includes("report")) return "file";
  return "activity";
}

function countUniqueFiles(sections: ProjectSection[]): number {
  const files = new Set<string>();

  const visit = (section: ProjectSection) => {
    section.files.forEach((file) => files.add(file));
    section.children?.forEach(visit);
  };

  sections.forEach(visit);
  return files.size;
}

function findSection(sections: Section[], id: string): Section | undefined {
  return sections.find((section) => section.id === id);
}

function buildFrenchReply(project: Project, wantsQuality: boolean, wantsSites: boolean): string {
  if (wantsQuality) {
    const issueCount = project.qualityIssues.reduce((sum, issue) => sum + issue.count, 0);
    return `${project.name} presente ${issueCount} points de qualite a verifier dans cette vue prototype. La priorite est de confirmer les champs manquants, les identifiants et les libelles de site avant d'utiliser ces chiffres dans un rapport.`;
  }

  if (wantsSites) {
    const topSite = project.sites[0];
    return `${project.name} montre des ecarts entre sites. ${topSite.site} ressort avec ${topSite.value} en volume indicatif; il faut comparer ce niveau avec la cible, la saison et les contraintes d'acces avant de conclure.`;
  }

  return `${project.name}: ${project.story.fr} Pour une lecture operationnelle, je regarderais d'abord la tendance mensuelle, les sites en baisse et les alertes qualite avant de produire une synthese bailleur.`;
}

function buildEnglishReply(project: Project, wantsQuality: boolean, wantsSites: boolean): string {
  if (wantsQuality) {
    const issueCount = project.qualityIssues.reduce((sum, issue) => sum + issue.count, 0);
    return `${project.name} has ${issueCount} quality points to review in this prototype view. The priority is to confirm missing fields, identifiers, and facility labels before using these figures in a report.`;
  }

  if (wantsSites) {
    const topSite = project.sites[0];
    return `${project.name} shows differences between sites. ${topSite.site} stands out with ${topSite.value} indicative volume; compare that with targets, seasonality, and access constraints before drawing conclusions.`;
  }

  return `${project.name}: ${project.story.en} For an operational read, I would first check monthly trends, declining sites, and quality alerts before generating a donor summary.`;
}
