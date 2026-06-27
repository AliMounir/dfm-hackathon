"use client";

import { type ComponentType, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Ambulance,
  Baby,
  BarChart3,
  BookOpen,
  Bot,
  Bus,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  CloudRain,
  Database,
  FileText,
  FileSpreadsheet,
  FolderPlus,
  Globe2,
  HandCoins,
  HeartPulse,
  Languages,
  LayoutDashboard,
  LineChart,
  Map,
  MapPin,
  Megaphone,
  MessageSquareText,
  Microscope,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type Language,
  type Metric,
  type MetricTone,
  type Project,
  type ProjectSection,
  overviewMetrics,
  overviewMonthly,
  projects,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

const copy = {
  fr: {
    appTitle: "DFM M&E Assistant",
    appSubtitle: "Qualite, interpretation et rapports",
    overview: "Vue ensemble",
    allProjects: "Tous les projets",
    projectSubsets: "Sous-pages projet",
    addProject: "Ajouter un projet",
    addProjectShort: "Ajouter",
    newProjectPlaceholder: "Nom du nouveau projet",
    searchPlaceholder: "Rechercher un projet",
    activePeriod: "Periode active",
    periodValue: "27 Dec 2025 - 27 Jun 2026",
    demoBadge: "Prototype demo",
    overviewTitle: "Vue d'ensemble des projets DFM",
    overviewLead:
      "Un espace unique pour charger les exports REDCap, DHIS2, Excel et registres, puis obtenir des controles qualite, des tendances et des syntheses pretes a partager.",
    selectedLead:
      "Tableau de bord projet avec indicateurs, controles qualite et explications generees pour l'equipe.",
    dataFolder: "Dossier donnees",
    dataSources: "Sources",
    activeDataset: "Jeu de donnees actif",
    attachedFiles: "Fichiers rattaches",
    activityTrend: "Tendance activite et risques",
    facilityFocus: "Sites a regarder",
    qualityChecks: "Controles qualite",
    insightPanel: "Explications assistant",
    storyTitle: "Histoire d'impact",
    questionsTitle: "Questions rapides",
    options: "Options",
    qualityMode: "Qualite des donnees",
    reportMode: "Rapport",
    settings: "Parametres",
    language: "FR",
    ask: "Poser une question",
    askPlaceholder: "Ex: Quels CSB ont le plus de cas compliques ?",
    suggestedAction: "Action suggeree",
    whyItMatters: "Pourquoi c'est important",
    noProject:
      "Selectionnez un projet a gauche pour voir son tableau de bord detaille.",
    overviewTab: "Synthese",
    qualityTab: "Qualite",
    storyTab: "Narratif",
    serviceLabel: "Activites",
    riskLabel: "Risques",
    targetLabel: "Cible",
    readyForGithub:
      "Les dossiers de donnees sont prets pour GitHub; ajoutez les exports dans chaque dossier projet.",
    reportPeriod: "Periode du rapport",
    periodType: "Selection le type de periode:",
    monthly: "Mensuel",
    quarterly: "Trimestriel",
    semester: "Semestriel",
    annual: "Annuel",
  },
  en: {
    appTitle: "DFM M&E Assistant",
    appSubtitle: "Quality, interpretation, and reporting",
    overview: "Overview",
    allProjects: "All projects",
    projectSubsets: "Project subpages",
    addProject: "Add project",
    addProjectShort: "Add",
    newProjectPlaceholder: "New project name",
    searchPlaceholder: "Search projects",
    activePeriod: "Active period",
    periodValue: "Dec 27 2025 - Jun 27 2026",
    demoBadge: "Demo prototype",
    overviewTitle: "DFM projects overview",
    overviewLead:
      "One workspace to load REDCap, DHIS2, Excel, and register exports, then get quality checks, trends, and shareable summaries.",
    selectedLead:
      "Project dashboard with indicators, quality checks, and generated explanations for the team.",
    dataFolder: "Data folder",
    dataSources: "Sources",
    activeDataset: "Active dataset",
    attachedFiles: "Attached files",
    activityTrend: "Activity and risk trend",
    facilityFocus: "Facilities to review",
    qualityChecks: "Quality checks",
    insightPanel: "Assistant explanations",
    storyTitle: "Impact story",
    questionsTitle: "Quick questions",
    options: "Options",
    qualityMode: "Data quality",
    reportMode: "Report",
    settings: "Settings",
    language: "EN",
    ask: "Ask question",
    askPlaceholder: "Example: Which facilities have the most complicated cases?",
    suggestedAction: "Suggested action",
    whyItMatters: "Why it matters",
    noProject: "Select a project on the left to see its detailed dashboard.",
    overviewTab: "Summary",
    qualityTab: "Quality",
    storyTab: "Narrative",
    serviceLabel: "Activities",
    riskLabel: "Risks",
    targetLabel: "Target",
    readyForGithub:
      "Data folders are ready for GitHub; add exports inside each project folder.",
    reportPeriod: "Report period",
    periodType: "Select period type:",
    monthly: "Monthly",
    quarterly: "Quarterly",
    semester: "Semester",
    annual: "Annual",
  },
};

const metricToneClasses: Record<MetricTone, string> = {
  emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-900",
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  violet: "border-violet-200 bg-violet-50 text-violet-900",
};

const projectIcons = [HeartPulse, Stethoscope, Microscope, Activity];

const sectionIconMap: Record<
  ProjectSection["icon"],
  ComponentType<{ className?: string; "aria-hidden"?: boolean }>
> = {
  activity: Activity,
  ambulance: Ambulance,
  baby: Baby,
  book: BookOpen,
  bus: Bus,
  chart: BarChart3,
  clipboard: ClipboardList,
  file: FileSpreadsheet,
  map: Map,
  megaphone: Megaphone,
  money: HandCoins,
  shield: ShieldCheck,
  users: Users,
};

export default function Home() {
  const [language, setLanguage] = useState<Language>("fr");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [customProjects, setCustomProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState("summary");

  const t = copy[language];
  const projectList = useMemo(
    () => [...projects, ...customProjects],
    [customProjects],
  );

  const filteredProjects = projectList.filter((project) =>
    project.name.toLowerCase().includes(query.toLowerCase()),
  );

  const selectedProject = projectList.find(
    (project) => project.id === selectedProjectId,
  );
  const selectedSection = selectedProject
    ? findProjectSection(selectedProject.sections, selectedSectionId)
    : undefined;
  const selectedSectionFiles = selectedSection?.files ?? [];
  const activeDatasetLabel = selectedSection
    ? selectedSection.label[language]
    : selectedProject
      ? language === "fr"
        ? "Vue projet"
        : "Project overview"
      : language === "fr"
        ? "Tous les projets"
        : "All projects";

  const selectedMetrics = selectedProject?.metrics ?? overviewMetrics;
  const selectedMonthly = selectedProject?.monthly ?? overviewMonthly;

  function addProject() {
    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      setIsAdding(false);
      return;
    }

    const id = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const project: Project = {
      id: `${id || "project"}-${Date.now()}`,
      name: trimmedName,
      folder: `data/projects/${id || "new-project"}`,
      accent: "emerald",
      focus: {
        fr: "Nouvel espace projet pret a recevoir des exports et indicateurs.",
        en: "New project workspace ready for exports and indicators.",
      },
      dataSources: ["Excel", "REDCap", "DHIS2"],
      status: { fr: "Cree localement", en: "Created locally" },
      metrics: [
        {
          id: "empty",
          label: { fr: "Donnees importees", en: "Imported datasets" },
          value: "0",
          helper: { fr: "a connecter", en: "to connect" },
          tone: "emerald",
        },
        {
          id: "checks",
          label: { fr: "Controles actifs", en: "Active checks" },
          value: "0",
          helper: { fr: "a configurer", en: "to configure" },
          tone: "amber",
        },
      ],
      monthly: overviewMonthly.map((point) => ({
        ...point,
        services: 0,
        risks: 0,
      })),
      sites: [],
      qualityIssues: [],
      insights: [],
      suggestedQuestions: [
        {
          fr: "Quels controles qualite faut-il activer pour ce projet ?",
          en: "Which quality checks should be enabled for this project?",
        },
      ],
      story: {
        fr: "Ajoutez les exports du projet pour generer une synthese.",
        en: "Add project exports to generate a summary.",
      },
      sections: [],
    };

    setCustomProjects((current) => [...current, project]);
    setSelectedProjectId(project.id);
    setSelectedSectionId(null);
    setNewProjectName("");
    setIsAdding(false);
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-stone-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex w-full flex-col bg-[#153b36] text-white lg:fixed lg:inset-y-0 lg:w-[320px]">
          <div className="border-b border-white/10 px-5 py-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#153b36]">
                  <HeartPulse className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold tracking-normal">
                    {t.appTitle}
                  </h1>
                  <p className="text-xs text-white/70">{t.appSubtitle}</p>
                </div>
              </div>
              <Button
                title="Language"
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() =>
                  setLanguage((current) => (current === "fr" ? "en" : "fr"))
                }
              >
                <Languages className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold transition-colors",
                selectedProjectId === null
                  ? "bg-white text-[#153b36]"
                  : "text-white/80 hover:bg-white/10 hover:text-white",
              )}
              onClick={() => {
                setSelectedProjectId(null);
                setSelectedSectionId(null);
              }}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              {t.overview}
            </button>

            <div>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-white/60">
                  {t.allProjects}
                </p>
                <Button
                  title={t.addProject}
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white"
                  onClick={() => setIsAdding((current) => !current)}
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>

              <div className="relative mb-3">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45"
                  aria-hidden="true"
                />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="border-white/10 bg-white/10 pl-9 text-white placeholder:text-white/45 focus:border-white/40 focus:ring-white/10"
                />
              </div>

              {isAdding && (
                <div className="mb-3 flex gap-2">
                  <Input
                    value={newProjectName}
                    onChange={(event) => setNewProjectName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") addProject();
                    }}
                    placeholder={t.newProjectPlaceholder}
                    className="border-white/10 bg-white text-stone-950"
                  />
                  <Button
                    title={t.addProject}
                    size="icon"
                    className="shrink-0"
                    onClick={addProject}
                  >
                    <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              )}

              <div className="space-y-1">
                {filteredProjects.map((project, index) => {
                  const Icon = projectIcons[index % projectIcons.length];
                  const active = selectedProjectId === project.id;

                  return (
                    <div key={project.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                          active
                            ? "bg-white text-[#153b36]"
                            : "text-white/80 hover:bg-white/10 hover:text-white",
                        )}
                        onClick={() => {
                          setSelectedProjectId(project.id);
                          setSelectedSectionId(null);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {project.name}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            active && "rotate-90",
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {active && project.sections.length > 0 && (
                        <div className="mb-2 mt-1 border-l border-white/10 pl-3">
                          <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
                            {t.projectSubsets}
                          </p>
                          <div className="space-y-1">
                            {project.sections.map((section) => (
                              <ProjectSectionNav
                                key={section.id}
                                section={section}
                                selectedSectionId={selectedSectionId}
                                language={language}
                                onSelect={(sectionId) => {
                                  setSelectedProjectId(project.id);
                                  setSelectedSectionId(sectionId);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {selectedProject && (
            <SidebarFilters
              language={language}
              selectedProjectId={selectedProject.id}
              labels={t}
            />
          )}

          <div className="mt-auto border-t border-white/10 p-4">
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-white/60">
              {t.options}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <SidebarTool icon={ClipboardCheck} label={t.qualityMode} />
              <SidebarTool icon={FileText} label={t.reportMode} />
              <SidebarTool icon={Settings} label={t.settings} />
            </div>
            <button
              className="mt-3 flex w-full items-center justify-between rounded-md bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/15"
              onClick={() =>
                setLanguage((current) => (current === "fr" ? "en" : "fr"))
              }
            >
              <span className="flex items-center gap-2">
                <Globe2 className="h-4 w-4" aria-hidden="true" />
                {t.language}
              </span>
              <span>{language === "fr" ? "English" : "Francais"}</span>
            </button>
          </div>
        </aside>

        <section className="flex min-h-screen flex-1 flex-col lg:ml-[320px]">
          <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 px-5 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{t.demoBadge}</Badge>
                  <Badge variant="info">{t.activePeriod}: {t.periodValue}</Badge>
                  <Badge variant="default">
                    {t.activeDataset}: {activeDatasetLabel}
                  </Badge>
                </div>
                <h2 className="text-2xl font-semibold tracking-normal text-stone-950">
                  {selectedProject
                    ? selectedSection
                      ? `${selectedProject.name} / ${selectedSection.label[language]}`
                      : selectedProject.name
                    : t.overviewTitle}
                </h2>
                <p className="mt-1 max-w-4xl text-sm leading-6 text-stone-600">
                  {selectedProject
                    ? selectedSectionFiles.length > 0
                      ? `${selectedProject.focus[language]} ${t.attachedFiles}: ${selectedSectionFiles.join(", ")}.`
                      : selectedProject.focus[language]
                    : t.overviewLead}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 sm:w-[360px]">
                  <MessageSquareText
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400"
                    aria-hidden="true"
                  />
                  <Input placeholder={t.askPlaceholder} className="pl-9" />
                </div>
                <Button>
                  <Bot className="h-4 w-4" aria-hidden="true" />
                  {t.ask}
                </Button>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-6 lg:px-8">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger
                  active={activeTab === "summary"}
                  onClick={() => setActiveTab("summary")}
                >
                  <BarChart3 className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {t.overviewTab}
                </TabsTrigger>
                <TabsTrigger
                  active={activeTab === "quality"}
                  onClick={() => setActiveTab("quality")}
                >
                  <ShieldCheck className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {t.qualityTab}
                </TabsTrigger>
                <TabsTrigger
                  active={activeTab === "story"}
                  onClick={() => setActiveTab("story")}
                >
                  <Sparkles className="mr-2 inline h-4 w-4" aria-hidden="true" />
                  {t.storyTab}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {selectedMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} language={language} />
              ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
              <section className="rounded-lg border border-stone-200 bg-white">
                <div className="flex flex-col gap-2 border-b border-stone-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-stone-950">
                      {t.activityTrend}
                    </h3>
                    <p className="text-sm leading-6 text-stone-600">
                      {selectedProject
                        ? `${t.selectedLead} ${t.activeDataset}: ${activeDatasetLabel}.`
                        : t.readyForGithub}
                    </p>
                  </div>
                  <Badge variant="default">
                    <LineChart className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    M&E
                  </Badge>
                </div>
                <div className="h-[320px] p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={selectedMonthly}>
                      <CartesianGrid stroke="#e7e5e4" vertical={false} />
                      <XAxis dataKey="month" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} width={42} />
                      <Tooltip
                        cursor={{ fill: "#f5f5f4" }}
                        contentStyle={{
                          borderRadius: "8px",
                          borderColor: "#e7e5e4",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                        }}
                      />
                      <Bar
                        dataKey="services"
                        name={t.serviceLabel}
                        fill="#059669"
                        radius={[6, 6, 0, 0]}
                      />
                      <Line
                        dataKey="target"
                        name={t.targetLabel}
                        stroke="#0891b2"
                        strokeWidth={3}
                        dot={false}
                      />
                      <Line
                        dataKey="risks"
                        name={t.riskLabel}
                        stroke="#e11d48"
                        strokeWidth={2}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="rounded-lg border border-stone-200 bg-white">
                <div className="border-b border-stone-100 p-5">
                  <h3 className="text-base font-semibold text-stone-950">
                    {t.facilityFocus}
                  </h3>
                  <p className="text-sm leading-6 text-stone-600">
                    {selectedProject
                      ? selectedSectionFiles.length > 0
                        ? `${selectedProject.folder} / ${selectedSectionFiles.join(", ")}`
                        : selectedProject.folder
                      : "data/projects/*"}
                  </p>
                </div>
                <div className="space-y-4 p-5">
                  {(selectedProject?.sites.length
                    ? selectedProject.sites
                    : projects.slice(0, 5).map((project, index) => ({
                        site: project.name,
                        value: 88 - index * 8,
                        change: index % 2 === 0 ? 6 : -4,
                      }))
                  ).map((site) => (
                    <div key={site.site} className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MapPin className="h-4 w-4 shrink-0 text-stone-400" />
                          <span className="truncate text-sm font-semibold text-stone-800">
                            {site.site}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold",
                            site.change >= 0 ? "text-emerald-700" : "text-rose-700",
                          )}
                        >
                          {site.change >= 0 ? (
                            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {site.change > 0 ? "+" : ""}
                          {site.change}%
                        </span>
                      </div>
                      <Progress value={Math.min(100, site.value)} />
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-stone-950">
                      {t.qualityChecks}
                    </h3>
                    <p className="text-sm leading-6 text-stone-600">
                      {selectedProject
                        ? `${selectedProject.folder} - ${activeDatasetLabel}`
                        : "data/projects"}
                    </p>
                  </div>
                  <Badge variant="warning">
                    <AlertTriangle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    {selectedProject
                      ? selectedProject.qualityIssues.length
                      : projects.length}{" "}
                    checks
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {(selectedProject?.qualityIssues.length
                    ? selectedProject.qualityIssues
                    : projects.slice(0, 3).flatMap((project) =>
                        project.qualityIssues.slice(0, 1).map((issue) => ({
                          ...issue,
                          id: `${project.id}-${issue.id}`,
                          title: {
                            fr: `${project.name}: ${issue.title.fr}`,
                            en: `${project.name}: ${issue.title.en}`,
                          },
                        })),
                      )
                  ).map((issue) => (
                    <Card key={issue.id}>
                      <CardContent className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-stone-950">
                              {issue.title[language]}
                            </h4>
                            <p className="mt-1 text-sm leading-6 text-stone-600">
                              {issue.whyItMatters[language]}
                            </p>
                          </div>
                          <SeverityBadge severity={issue.severity} count={issue.count} />
                        </div>
                        <div className="rounded-md bg-stone-50 p-3 text-sm leading-6 text-stone-700">
                          <span className="font-semibold text-stone-950">
                            {t.suggestedAction}:{" "}
                          </span>
                          {issue.action[language]}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-stone-950">
                      {t.insightPanel}
                    </h3>
                    <p className="text-sm leading-6 text-stone-600">
                      {selectedProject
                        ? selectedSectionFiles.length > 0
                          ? selectedSectionFiles.join(" / ")
                          : selectedProject.dataSources.join(" / ")
                        : "REDCap / DHIS2 / Excel"}
                    </p>
                  </div>
                  <Badge variant="default">
                    <Bot className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    AI
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {(selectedProject?.insights.length
                    ? selectedProject.insights
                    : projects.slice(0, 2).flatMap((project) =>
                        project.insights.slice(0, 1).map((insight) => ({
                          ...insight,
                          id: `${project.id}-${insight.id}`,
                        })),
                      )
                  ).map((insight) => (
                    <Card key={insight.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle>{insight.title[language]}</CardTitle>
                            <CardDescription>{insight.body[language]}</CardDescription>
                          </div>
                          <Badge variant="info">{insight.tag[language]}</Badge>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </section>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(320px,0.2fr)]">
              <Card>
                <CardHeader>
                  <CardTitle>{t.storyTitle}</CardTitle>
                  <CardDescription>
                    {selectedProject
                      ? selectedProject.story[language]
                      : language === "fr"
                        ? "Le prototype montre comment passer des exports bruts a une lecture actionnable: qualite des donnees, tendances, risques et message clair pour les equipes ou bailleurs."
                        : "The prototype shows how raw exports become actionable reading: data quality, trends, risks, and clear messages for teams or donors."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-3">
                    <StoryStep
                      icon={Database}
                      title={language === "fr" ? "Importer" : "Import"}
                      body={
                        language === "fr"
                          ? "Deposer les exports dans le dossier projet."
                          : "Drop exports into the project folder."
                      }
                    />
                    <StoryStep
                      icon={CheckCircle2}
                      title={language === "fr" ? "Verifier" : "Check"}
                      body={
                        language === "fr"
                          ? "Detecter les valeurs manquantes et incoherences."
                          : "Detect missing values and inconsistencies."
                      }
                    />
                    <StoryStep
                      icon={Sparkles}
                      title={language === "fr" ? "Expliquer" : "Explain"}
                      body={
                        language === "fr"
                          ? "Produire une synthese claire et contextualisee."
                          : "Produce a clear contextualized summary."
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t.questionsTitle}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(selectedProject?.suggestedQuestions ??
                    projects[0].suggestedQuestions
                  ).map((question) => (
                    <button
                      key={question[language]}
                      className="w-full rounded-md border border-stone-200 bg-white px-3 py-3 text-left text-sm leading-5 text-stone-700 transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                    >
                      {question[language]}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SidebarTool({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <button
      title={label}
      className="flex h-10 items-center justify-center rounded-md bg-white/10 text-white/80 hover:bg-white/15 hover:text-white"
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
    </button>
  );
}

function ProjectSectionNav({
  section,
  selectedSectionId,
  language,
  onSelect,
  depth = 0,
}: {
  section: ProjectSection;
  selectedSectionId: string | null;
  language: Language;
  onSelect: (sectionId: string) => void;
  depth?: number;
}) {
  const Icon = sectionIconMap[section.icon];
  const active = selectedSectionId === section.id;
  const hasActiveChild =
    section.children?.some((child) => child.id === selectedSectionId) ?? false;

  return (
    <div>
      <button
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
          active
            ? "bg-white/15 text-white"
            : hasActiveChild
              ? "text-white"
              : "text-white/65 hover:bg-white/10 hover:text-white",
          depth > 0 && "pl-8",
        )}
        onClick={() => onSelect(section.id)}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {section.label[language]}
        </span>
        {section.files.length > 0 && (
          <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-white/60">
            {section.files.length}
          </span>
        )}
      </button>

      {section.children && (
        <div className="mt-1 space-y-1">
          {section.children.map((child) => (
            <ProjectSectionNav
              key={child.id}
              section={child}
              selectedSectionId={selectedSectionId}
              language={language}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarFilters({
  selectedProjectId,
  labels,
}: {
  selectedProjectId: string;
  language: Language;
  labels: (typeof copy)["fr"];
}) {
  const filterOptions = getSidebarFilterOptions(selectedProjectId);

  return (
    <div className="border-t border-white/10 px-4 py-5">
      <p className="mb-3 px-1 text-base font-bold text-white">
        {labels.reportPeriod}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] overflow-hidden rounded-md border border-white/25 bg-white text-sm font-semibold text-stone-700">
        <div className="px-3 py-3 text-center">2025-12-27</div>
        <div className="border-x border-stone-300 px-4 py-3 text-center text-stone-500">
          to
        </div>
        <div className="px-3 py-3 text-center">2026-06-27</div>
      </div>

      {filterOptions.length > 0 && (
        <div className="mt-5 space-y-3">
          {filterOptions.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 text-sm font-semibold text-white"
            >
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 accent-sky-500"
              />
              {option}
            </label>
          ))}
        </div>
      )}

      <div className="mt-6">
        <p className="mb-3 px-1 text-sm font-bold text-white">
          {labels.periodType}
        </p>
        <div className="space-y-3">
          {[labels.monthly, labels.quarterly, labels.semester, labels.annual].map(
            (period, index) => (
              <label
                key={period}
                className="flex items-center gap-3 text-sm font-semibold text-white"
              >
                <input
                  type="radio"
                  name="period-type"
                  defaultChecked={index === 0}
                  className="h-4 w-4 accent-sky-500"
                />
                {period}
              </label>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  metric,
  language,
}: {
  metric: Metric;
  language: Language;
}) {
  return (
    <Card className={cn("border", metricToneClasses[metric.tone])}>
      <CardContent>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold opacity-80">
              {metric.label[language]}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-normal">
              {metric.value}
            </p>
            <p className="mt-2 text-sm opacity-75">{metric.helper[language]}</p>
          </div>
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-md bg-white/80",
            )}
          >
            {metric.id.includes("alert") || metric.tone === "rose" ? (
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            ) : metric.id.includes("benef") ? (
              <Users className="h-5 w-5" aria-hidden="true" />
            ) : metric.id.includes("comp") ? (
              <CloudRain className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Activity className="h-5 w-5" aria-hidden="true" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function findProjectSection(
  sections: ProjectSection[],
  sectionId: string | null,
): ProjectSection | undefined {
  if (!sectionId) return undefined;

  for (const section of sections) {
    if (section.id === sectionId) return section;

    const child = section.children
      ? findProjectSection(section.children, sectionId)
      : undefined;

    if (child) return child;
  }

  return undefined;
}

function getSidebarFilterOptions(projectId: string) {
  const optionsByProject: Record<string, string[]> = {
    mafy: ["Toliara-I", "Ampanihy-Ouest", "Taolagnaro"],
    mchp: ["Manambaro", "Ejeda"],
    profess: ["Qualite 5S", "Supervision", "Plan d'action"],
  };

  return optionsByProject[projectId] ?? [];
}

function SeverityBadge({
  severity,
  count,
}: {
  severity: "high" | "medium" | "low";
  count: number;
}) {
  const variant =
    severity === "high" ? "danger" : severity === "medium" ? "warning" : "neutral";

  return <Badge variant={variant}>{count}</Badge>;
}

function StoryStep({
  icon: Icon,
  title,
  body,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white text-emerald-700">
        <Icon className="h-4 w-4" aria-hidden={true} />
      </div>
      <p className="font-semibold text-stone-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-stone-600">{body}</p>
    </div>
  );
}
