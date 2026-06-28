"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
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
  ClipboardList,
  CloudRain,
  Database,
  FileText,
  FileSpreadsheet,
  FolderPlus,
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
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  RefreshCw,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  Upload,
  Users,
  X,
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
    appTitle: "Hazava AI",
    appSubtitle: "Assistant M&E pour DFM",
    overview: "Vue ensemble",
    allProjects: "Tous les projets",
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
    uploadData: "Importer",
    uploadTitle: "Importer des donnees",
    uploadLead:
      "Ajoutez des exports Excel, CSV, REDCap, DHIS2 ou registres, puis choisissez le projet de destination.",
    uploadDropTitle: "Glissez vos fichiers ici",
    uploadDropHelp: "ou choisissez des fichiers depuis votre ordinateur",
    chooseFiles: "Choisir des fichiers",
    selectedFiles: "Fichiers selectionnes",
    noFilesSelected: "Aucun fichier selectionne",
    projectAssignment: "Affectation projet",
    targetProject: "Projet cible",
    autoAssign: "Affectation automatique",
    autoAssignHelp: "Detecter le projet depuis le nom du fichier",
    createNewProject: "Creer un nouveau projet",
    newProjectNameUpload: "Nom du nouveau projet",
    workflowPreview: "Suivi du workflow",
    workflowReady: "Pret a traiter",
    workflowInProgress: "Workflow prepare",
    workflowDone: "Termine",
    workflowActive: "En cours",
    workflowWaiting: "En attente",
    workflowSaved: "Enregistre",
    workflowFailed: "Erreur",
    uploadStageReceived: "Fichier recu",
    uploadStageFolder: "Dossier projet selectionne ou cree",
    uploadStageConvert: "Conversion XLSX vers Markdown",
    uploadStageExtract: "Lecture et extraction des informations",
    uploadStageQuality: "Donnees manquantes signalees",
    uploadStageApproval: "Validation utilisateur avant import final",
    startWorkflow: "Lancer le workflow",
    filters: "Filtres",
    close: "Fermer",
    applyFilters: "Appliquer",
    startDate: "Date debut",
    endDate: "Date fin",
    filterContext: "Contexte",
    language: "FR",
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
    appTitle: "Hazava AI",
    appSubtitle: "M&E Assistant for DFM",
    overview: "Overview",
    allProjects: "All projects",
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
    uploadData: "Upload",
    uploadTitle: "Upload data",
    uploadLead:
      "Add Excel, CSV, REDCap, DHIS2, or register exports, then choose the destination project.",
    uploadDropTitle: "Drag files here",
    uploadDropHelp: "or choose files from your computer",
    chooseFiles: "Choose files",
    selectedFiles: "Selected files",
    noFilesSelected: "No files selected",
    projectAssignment: "Project assignment",
    targetProject: "Target project",
    autoAssign: "Auto assign",
    autoAssignHelp: "Detect the project from the file name",
    createNewProject: "Create new project",
    newProjectNameUpload: "New project name",
    workflowPreview: "Workflow progress",
    workflowReady: "Ready to process",
    workflowInProgress: "Workflow prepared",
    workflowDone: "Done",
    workflowActive: "In progress",
    workflowWaiting: "Waiting",
    workflowSaved: "Saved",
    workflowFailed: "Failed",
    uploadStageReceived: "File received",
    uploadStageFolder: "Project folder selected or created",
    uploadStageConvert: "XLSX converted to Markdown",
    uploadStageExtract: "File read and information extracted",
    uploadStageQuality: "Missing data flagged",
    uploadStageApproval: "User approval before final import",
    startWorkflow: "Start workflow",
    filters: "Filters",
    close: "Close",
    applyFilters: "Apply",
    startDate: "Start date",
    endDate: "End date",
    filterContext: "Context",
    language: "EN",
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
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [customProjects, setCustomProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState("summary");

  const t = copy[language];
  const projectList = useMemo(
    () => [...projects, ...customProjects],
    [customProjects],
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
    setExpandedProjectId(project.id);
    setSelectedSectionId(null);
    setNewProjectName("");
    setIsAdding(false);
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-stone-950">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "flex w-full flex-col bg-[#153B36] text-[#F5F3EF] transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:h-screen",
            isLeftSidebarOpen ? "lg:w-[320px]" : "lg:w-[72px]",
          )}
        >
          <div className={cn("shrink-0 border-b border-[#F5F3EF]/10 py-5", isLeftSidebarOpen ? "px-5" : "px-2")}>
            <div className={cn("flex items-center gap-3", !isLeftSidebarOpen && "justify-center")}>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-md bg-[#F4A623] text-[#153B36] shadow-sm", !isLeftSidebarOpen && "hidden")}>
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className={cn("min-w-0 flex-1", !isLeftSidebarOpen && "hidden")}>
                <h1 className="text-lg font-semibold tracking-normal text-[#F5F3EF]">
                  {t.appTitle}
                </h1>
                <p className="text-xs font-medium text-[#F5F3EF]/70">
                  {t.appSubtitle}
                </p>
              </div>
              <Button
                title={isLeftSidebarOpen ? "Collapse navigation" : "Open navigation"}
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-[#F5F3EF] hover:bg-[#F5F3EF]/10 hover:text-[#F5F3EF]"
                onClick={() => setIsLeftSidebarOpen((current) => !current)}
              >
                {isLeftSidebarOpen ? (
                  <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className={cn("py-4", isLeftSidebarOpen ? "px-4" : "px-2")}>
              <div className="space-y-1">
                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold transition-colors",
                    !isLeftSidebarOpen && "justify-center px-0",
                    selectedProjectId === null
                      ? "bg-[#F5F3EF] text-[#153B36]"
                      : "text-[#F5F3EF]/80 hover:bg-[#F5F3EF]/10 hover:text-[#F5F3EF]",
                  )}
                  onClick={() => {
                    setSelectedProjectId(null);
                    setExpandedProjectId(null);
                    setSelectedSectionId(null);
                  }}
                >
                  <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                  <span className={cn("min-w-0 flex-1 truncate", !isLeftSidebarOpen && "hidden")}>
                    {t.overview}
                  </span>
                </button>

                {projectList.map((project, index) => {
                  const Icon = projectIcons[index % projectIcons.length];
                  const active = selectedProjectId === project.id;
                  const expanded = expandedProjectId === project.id;

                  return (
                    <div key={project.id}>
                      <button
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors",
                          !isLeftSidebarOpen && "justify-center px-0",
                          active
                            ? "bg-[#F5F3EF] text-[#153B36]"
                            : "text-[#F5F3EF]/80 hover:bg-[#F5F3EF]/10 hover:text-[#F5F3EF]",
                        )}
                        onClick={() => {
                          if (active) {
                            setExpandedProjectId((current) =>
                              current === project.id ? null : project.id,
                            );
                          } else {
                            setSelectedProjectId(project.id);
                            setExpandedProjectId(project.id);
                          }
                          setSelectedSectionId(null);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className={cn("min-w-0 flex-1 truncate text-sm font-semibold", !isLeftSidebarOpen && "hidden")}>
                          {project.name}
                        </span>
                        <ChevronRight
                          className={cn(
                            "h-4 w-4 shrink-0 transition-transform",
                            expanded && "rotate-90",
                            !isLeftSidebarOpen && "hidden",
                          )}
                          aria-hidden="true"
                        />
                      </button>

                      {isLeftSidebarOpen && expanded && project.sections.length > 0 && (
                        <div className="mb-2 mt-1 border-l border-[#F4A623]/40 pl-3">
                          <div className="space-y-1">
                            {project.sections.map((section) => (
                              <ProjectSectionNav
                                key={section.id}
                                section={section}
                                selectedSectionId={selectedSectionId}
                                language={language}
                                onSelect={(sectionId) => {
                                  setSelectedProjectId(project.id);
                                  setExpandedProjectId(project.id);
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

                <button
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-[#F5F3EF]/70 transition-colors hover:bg-[#F5F3EF]/10 hover:text-[#F5F3EF]",
                    !isLeftSidebarOpen && "justify-center px-0",
                  )}
                  onClick={() => setIsAdding((current) => !current)}
                >
                  <FolderPlus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className={cn("min-w-0 flex-1 truncate", !isLeftSidebarOpen && "hidden")}>
                    {t.addProject}
                  </span>
                </button>

                {isLeftSidebarOpen && isAdding && (
                  <div className="flex gap-2 rounded-md bg-[#F5F3EF]/10 p-2">
                    <Input
                      value={newProjectName}
                      onChange={(event) => setNewProjectName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") addProject();
                      }}
                      placeholder={t.newProjectPlaceholder}
                      className="border-[#F5F3EF]/10 bg-[#F5F3EF] text-stone-950"
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
              </div>
            </div>
          </div>

          <div className={cn("shrink-0 border-t border-[#F5F3EF]/10 p-4", !isLeftSidebarOpen && "px-2")}>
            <div className={cn("grid gap-2", isLeftSidebarOpen ? "grid-cols-3" : "grid-cols-1")}>
              <SidebarTool
                icon={Upload}
                label={t.uploadData}
                onClick={() => setIsUploadModalOpen(true)}
              />
              <SidebarTool
                icon={Languages}
                label={language === "fr" ? "English" : "Francais"}
                onClick={() =>
                  setLanguage((current) => (current === "fr" ? "en" : "fr"))
                }
              />
              <SidebarTool
                icon={SlidersHorizontal}
                label={t.filters}
                onClick={() => setIsFilterModalOpen(true)}
              />
            </div>
          </div>
        </aside>

        <section
          className={cn(
            "flex min-h-screen flex-1 flex-col transition-[margin] duration-200",
            isLeftSidebarOpen ? "lg:ml-[320px]" : "lg:ml-[72px]",
            isAssistantOpen ? "lg:mr-[380px]" : "lg:mr-14",
          )}
        >
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
        <AssistantPanel
          isOpen={isAssistantOpen}
          language={language}
          selectedProject={selectedProject}
          selectedSection={selectedSection}
          onToggle={() => setIsAssistantOpen((current) => !current)}
        />
        {isUploadModalOpen && (
          <UploadModal
            labels={t}
            projects={projectList}
            selectedProjectId={selectedProject?.id ?? null}
            onClose={() => setIsUploadModalOpen(false)}
          />
        )}
        <FilterModal
          isOpen={isFilterModalOpen}
          labels={t}
          selectedProjectId={selectedProject?.id ?? null}
          selectedProjectName={
            selectedProject
              ? selectedSection
                ? `${selectedProject.name} / ${selectedSection.label[language]}`
                : selectedProject.name
              : t.overview
          }
          onClose={() => setIsFilterModalOpen(false)}
        />
      </div>
    </main>
  );
}

function SidebarTool({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex h-10 items-center justify-center rounded-md bg-[#F5F3EF]/10 text-[#F5F3EF]/80 hover:bg-[#F4A623]/20 hover:text-[#F5F3EF]"
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
    </button>
  );
}

type UploadFilePreview = {
  file: File;
  name: string;
  size: string;
  kind: string;
};

type UploadStageKey =
  | "received"
  | "folder"
  | "convert"
  | "extract"
  | "quality"
  | "approval";

type UploadStageState = "done" | "active" | "waiting" | "error";

type UploadStageView = {
  key: UploadStageKey;
  state: UploadStageState;
};

type UploadResponse = {
  batchId: string;
  stages: Array<{
    key: UploadStageKey;
    status: UploadStageState;
  }>;
};

type UploadBatchStatusResponse = {
  batch: {
    id: string;
    status: string;
    errorMessage: string | null;
  };
  stages: Array<{
    key: UploadStageKey;
    status: UploadStageState;
  }>;
};

function UploadModal({
  labels,
  projects,
  selectedProjectId,
  onClose,
}: {
  labels: (typeof copy)["fr"];
  projects: Project[];
  selectedProjectId: string | null;
  onClose: () => void;
}) {
  const [targetProjectId, setTargetProjectId] = useState(
    selectedProjectId ?? "auto",
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadFilePreview[]>([]);
  const [submittedStages, setSubmittedStages] = useState<UploadStageView[] | null>(
    null,
  );
  const [submittedBatchId, setSubmittedBatchId] = useState<string | null>(null);
  const [submittedBatchStatus, setSubmittedBatchStatus] = useState<string | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!submittedBatchId) return;

    let cancelled = false;

    async function refreshBatchStatus() {
      try {
        const response = await fetch(`/api/upload-batches/${submittedBatchId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as
          | UploadBatchStatusResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in payload ? payload.error : "Could not refresh workflow.",
          );
        }

        if (!("batch" in payload) || cancelled) return;

        setSubmittedBatchStatus(payload.batch.status);
        setSubmittedStages(
          payload.stages.map((stage) => ({
            key: stage.key,
            state: stage.status,
          })),
        );

        if (payload.batch.status === "failed" && payload.batch.errorMessage) {
          setUploadError(payload.batch.errorMessage);
        }
      } catch (error) {
        if (!cancelled) {
          setUploadError(
            error instanceof Error ? error.message : "Could not refresh workflow.",
          );
        }
      }
    }

    refreshBatchStatus();
    const intervalId = window.setInterval(refreshBatchStatus, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [submittedBatchId]);

  function handleFiles(files: FileList | File[]) {
    const selectedFiles = Array.from(files).map((file) => ({
      file,
      name: file.name,
      size: formatFileSize(file.size),
      kind: file.name.split(".").pop()?.toUpperCase() ?? "DATA",
    }));

    setUploadedFiles(selectedFiles);
    setSubmittedStages(null);
    setSubmittedBatchId(null);
    setSubmittedBatchStatus(null);
    setUploadError(null);
  }

  const hasFiles = uploadedFiles.length > 0;
  const showWorkflow =
    isSubmitting || submittedStages !== null || uploadError !== null;
  const workflowStages = getUploadWorkflowStages(hasFiles, isSubmitting, submittedStages);
  const workflowProgress = getUploadWorkflowProgress(workflowStages);

  async function submitUpload() {
    if (!hasFiles || isSubmitting) return;

    setIsSubmitting(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("projectId", targetProjectId);
    uploadedFiles.forEach((uploadFile) => {
      formData.append("files", uploadFile.file);
    });

    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json()) as UploadResponse | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      if (!("batchId" in payload)) {
        throw new Error("Upload response was missing workflow metadata.");
      }

      setSubmittedBatchId(payload.batchId);
      setSubmittedBatchStatus("received");
      setSubmittedStages(
        payload.stages.map((stage) => ({
          key: stage.key,
          state: stage.status,
        })),
      );
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
    >
      <div className="flex h-[min(760px,calc(100vh-3rem))] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-stone-200 bg-[#F5F3EF] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2FA66A]">
              {labels.uploadData}
            </p>
            <h2
              id="upload-title"
              className="mt-1 text-lg font-semibold tracking-normal text-[#153B36]"
            >
              {labels.uploadTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-600">
              {labels.uploadLead}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title={labels.close}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 p-5">
          <div className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-semibold text-stone-700">
              {labels.targetProject}
            </span>
            <select
              value={targetProjectId}
              onChange={(event) => setTargetProjectId(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-800 outline-none ring-[#2FA66A]/30 transition focus:ring-4"
            >
              <option value="auto">{labels.autoAssign}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
              <option value="new">{labels.createNewProject}</option>
            </select>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col rounded-lg border-2 bg-white",
              hasFiles
                ? "border-[#2FA66A]/30"
                : "items-center justify-center border-dashed border-[#2FA66A]/40 px-6 py-10 text-center",
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
          >
            {!hasFiles ? (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-[#153B36] text-[#F5F3EF]">
                  <Upload className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-xl font-semibold tracking-normal text-stone-950">
                  {labels.uploadDropTitle}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-stone-500">
                  {labels.uploadDropHelp}
                </p>
                <label className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-[#F4A623] px-4 text-sm font-semibold text-[#153B36] hover:bg-[#F4A623]/90">
                  {labels.chooseFiles}
                  <input
                    type="file"
                    multiple
                    accept=".xlsx,.xls,.csv,.tsv,.json,.zip"
                    className="sr-only"
                    onChange={(event) => {
                      if (event.target.files) handleFiles(event.target.files);
                    }}
                  />
                </label>
              </>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
                <div className="flex flex-col gap-3 border-b border-stone-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-stone-950">
                      {showWorkflow ? labels.workflowPreview : labels.selectedFiles}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {submittedBatchId
                        ? `Batch ${submittedBatchId.slice(0, 8)}`
                        : `${uploadedFiles.length} ${labels.selectedFiles.toLowerCase()}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showWorkflow && (
                      <Badge
                        variant={
                          uploadError || submittedBatchStatus === "failed"
                            ? "danger"
                            : submittedBatchId
                              ? "default"
                              : "info"
                        }
                      >
                        {uploadError || submittedBatchStatus === "failed"
                          ? labels.workflowFailed
                          : isSubmitting
                            ? labels.workflowActive
                            : submittedBatchId
                              ? labels.workflowSaved
                              : labels.workflowInProgress}
                      </Badge>
                    )}
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-stone-200 bg-white px-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                      {labels.chooseFiles}
                      <input
                        type="file"
                        multiple
                        accept=".xlsx,.xls,.csv,.tsv,.json,.zip"
                        className="sr-only"
                        onChange={(event) => {
                          if (event.target.files) handleFiles(event.target.files);
                        }}
                      />
                    </label>
                  </div>
                </div>

                {!showWorkflow ? (
                  <div className="flex flex-1 items-center justify-center py-8">
                    <div className="w-full max-w-xl space-y-2">
                      {uploadedFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}`}
                          className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-3"
                        >
                          <FileSpreadsheet
                            className="h-4 w-4 shrink-0 text-[#2FA66A]"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-stone-800">
                              {file.name}
                            </p>
                            <p className="text-xs text-stone-500">
                              {file.kind} - {file.size}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 py-4 lg:grid-cols-[0.85fr_1fr]">
                    <div className="space-y-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={`${file.name}-${file.size}`}
                        className="flex items-center gap-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2"
                      >
                        <FileSpreadsheet
                          className="h-4 w-4 shrink-0 text-[#2FA66A]"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-800">
                            {file.name}
                          </p>
                          <p className="text-xs text-stone-500">
                            {file.kind} - {file.size}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>

                    <div>
                    {uploadError && (
                      <div className="mb-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                        {uploadError}
                      </div>
                    )}
                    <Progress value={workflowProgress} />
                    <div className="mt-4 space-y-2">
                      {workflowStages.map((stage) => (
                        <div
                          key={stage.key}
                          className="flex items-center gap-3 rounded-md bg-stone-50 px-3 py-2"
                        >
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              stage.state === "done"
                                ? "bg-[#2FA66A] text-white"
                                : stage.state === "active"
                                  ? "bg-[#F4A623] text-[#153B36]"
                                  : "bg-stone-200 text-stone-500",
                            )}
                          >
                            {stage.state === "done" ? (
                              <CheckCircle2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            ) : stage.state === "active" ? (
                              <RefreshCw
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            ) : (
                              <ClipboardList
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-stone-800">
                              {getUploadStageLabel(labels, stage.key)}
                            </p>
                            <p className="text-xs text-stone-500">
                              {stage.state === "done"
                                ? labels.workflowDone
                                : stage.state === "active"
                                  ? labels.workflowActive
                                  : labels.workflowWaiting}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {labels.close}
          </Button>
          <Button
            className="bg-[#153B36] text-[#F5F3EF] hover:bg-[#153B36]/90"
            disabled={!hasFiles || isSubmitting || Boolean(submittedBatchId)}
            onClick={submitUpload}
          >
            {isSubmitting ? labels.workflowActive : labels.startWorkflow}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssistantPanel({
  isOpen,
  language,
  selectedProject,
  selectedSection,
  onToggle,
}: {
  isOpen: boolean;
  language: Language;
  selectedProject?: Project;
  selectedSection?: ProjectSection;
  onToggle: () => void;
}) {
  const [draft, setDraft] = useState("");
  const isFrench = language === "fr";
  const contextLabel = selectedProject
    ? selectedSection
      ? `${selectedProject.name} / ${selectedSection.label[language]}`
      : selectedProject.name
    : isFrench
      ? "Tous les projets"
      : "All projects";
  const suggestions = isFrench
    ? [
        "Quels changements demandent une attention cette semaine ?",
        "Quels controles qualite faut-il lancer en priorite ?",
        "Prepare une synthese courte pour une reunion projet.",
      ]
    : [
        "Which changes need attention this week?",
        "Which quality checks should run first?",
        "Prepare a short summary for a project meeting.",
      ];

  if (!isOpen) {
    return (
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-14 flex-col border-l border-stone-200 bg-white shadow-sm lg:flex">
        <button
          type="button"
          aria-label={isFrench ? "Ouvrir l'assistant" : "Open assistant"}
          title={isFrench ? "Ouvrir l'assistant" : "Open assistant"}
          className="flex h-14 items-center justify-center border-b border-stone-200 text-stone-600 hover:bg-stone-100 hover:text-stone-950"
          onClick={onToggle}
        >
          <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-stone-400">
            {isFrench ? "Assistant" : "Assistant"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-[380px] flex-col border-l border-stone-200 bg-white shadow-sm lg:flex">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#153B36] text-[#F5F3EF] ring-2 ring-[#F4A623]/25">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-stone-950">
              {isFrench ? "Assistant M&E" : "M&E Assistant"}
            </h2>
            <p className="truncate text-xs text-stone-500">{contextLabel}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          title={isFrench ? "Fermer l'assistant" : "Close assistant"}
          onClick={onToggle}
        >
          <PanelRightClose className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="shrink-0 border-b border-stone-100 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge variant="default">{isFrench ? "Francais" : "English"}</Badge>
          <Badge variant="info">{isFrench ? "Contexte actif" : "Active context"}</Badge>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <AssistantAction
            icon={MessageSquareText}
            label={isFrench ? "Question" : "Question"}
          />
          <AssistantAction
            icon={SlidersHorizontal}
            label={isFrench ? "Mode" : "Mode"}
          />
          <AssistantAction
            icon={RefreshCw}
            label={isFrench ? "Reset" : "Reset"}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-stone-50 p-4">
        <ChatBubble
          role="assistant"
          text={
            isFrench
              ? "Bonjour. Je peux aider a verifier la qualite des donnees, expliquer les tendances, comparer les sites et preparer une synthese pour l'equipe ou les partenaires."
              : "Hello. I can help check data quality, explain trends, compare facilities, and prepare a summary for teams or partners."
          }
        />
        <ChatBubble
          role="user"
          text={
            isFrench
              ? "Analyse le contexte selectionne et propose les points d'attention."
              : "Analyze the selected context and suggest attention points."
          }
        />
        <ChatBubble
          role="assistant"
          text={
            isFrench
              ? "Pret. Dans la version connectee, je lirai les exports du projet actif, citerai les indicateurs utilises et separerai les faits des hypotheses."
              : "Ready. In the connected version, I will read the active project's exports, cite the indicators used, and separate facts from hypotheses."
          }
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            {isFrench ? "Suggestions" : "Suggestions"}
          </p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-sm leading-5 text-stone-700 hover:border-[#2FA66A]/50 hover:bg-[#2FA66A]/10"
              onClick={() => setDraft(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-stone-200 bg-white p-4">
        <div className="mb-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Paperclip className="h-4 w-4" aria-hidden="true" />
            {isFrench ? "Joindre" : "Attach"}
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <FileText className="h-4 w-4" aria-hidden="true" />
            {isFrench ? "Rapport" : "Report"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              isFrench
                ? "Posez une question sur les donnees..."
                : "Ask a question about the data..."
            }
          />
          <Button size="icon" title={isFrench ? "Envoyer" : "Send"}>
            <Send className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-2 text-xs leading-5 text-stone-500">
          {isFrench
            ? "Prototype UI: la connexion aux donnees et au modele sera branchee ensuite."
            : "Prototype UI: data and model connections will be wired next."}
        </p>
      </div>
    </aside>
  );
}

function AssistantAction({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
}) {
  return (
    <button
      type="button"
      className="flex h-10 items-center justify-center gap-2 rounded-md border border-stone-200 bg-white text-xs font-semibold text-stone-700 hover:bg-stone-100"
    >
      <Icon className="h-4 w-4" aria-hidden={true} />
      {label}
    </button>
  );
}

function ChatBubble({ role, text }: { role: "assistant" | "user"; text: string }) {
  const isAssistant = role === "assistant";

  return (
    <div className={cn("flex", isAssistant ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[88%] rounded-lg px-3 py-2 text-sm leading-6 shadow-sm",
          isAssistant
            ? "border border-stone-200 bg-white text-stone-700"
            : "bg-[#153B36] text-[#F5F3EF]",
        )}
      >
        {text}
      </div>
    </div>
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
            ? "bg-[#F4A623]/20 text-[#F5F3EF]"
            : hasActiveChild
              ? "text-[#F5F3EF]"
              : "text-[#F5F3EF]/65 hover:bg-[#F5F3EF]/10 hover:text-[#F5F3EF]",
          depth > 0 && "pl-8",
        )}
        onClick={() => onSelect(section.id)}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
        <span className="min-w-0 flex-1 truncate font-semibold">
          {section.label[language]}
        </span>
        {section.files.length > 0 && (
          <span className="rounded bg-[#F5F3EF]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#F5F3EF]/60">
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

function FilterModal({
  isOpen,
  selectedProjectId,
  selectedProjectName,
  labels,
  onClose,
}: {
  isOpen: boolean;
  selectedProjectId: string | null;
  selectedProjectName: string;
  labels: (typeof copy)["fr"];
  onClose: () => void;
}) {
  const filterOptions = selectedProjectId
    ? getSidebarFilterOptions(selectedProjectId)
    : [];

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-title"
    >
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-stone-200 bg-[#F5F3EF] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2FA66A]">
              {labels.filterContext}: {selectedProjectName}
            </p>
            <h2
              id="filters-title"
              className="mt-1 text-lg font-semibold tracking-normal text-[#153B36]"
            >
              {labels.reportPeriod}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title={labels.close}
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-stone-700">
              <span>{labels.startDate}</span>
              <Input type="date" defaultValue="2025-12-27" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-stone-700">
              <span>{labels.endDate}</span>
              <Input type="date" defaultValue="2026-06-27" />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-stone-900">
              {labels.periodType}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[labels.monthly, labels.quarterly, labels.semester, labels.annual].map(
                (period, index) => (
                  <label
                    key={period}
                    className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700"
                  >
                    <input
                      type="radio"
                      name="period-type"
                      defaultChecked={index === 0}
                      className="h-4 w-4 accent-[#2FA66A]"
                    />
                    {period}
                  </label>
                ),
              )}
            </div>
          </div>

          {filterOptions.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-stone-900">
                {selectedProjectName}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filterOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-3 py-3 text-sm font-semibold text-stone-700"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 accent-[#2FA66A]"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {labels.close}
          </Button>
          <Button className="bg-[#153B36] text-[#F5F3EF] hover:bg-[#153B36]/90" onClick={onClose}>
            {labels.applyFilters}
          </Button>
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

function getUploadWorkflowStages(
  hasFiles: boolean,
  isSubmitting: boolean,
  submittedStages: UploadStageView[] | null,
): UploadStageView[] {
  if (submittedStages) return submittedStages;

  const initialStages: UploadStageKey[] = [
    "received",
    "folder",
    "convert",
    "extract",
    "quality",
    "approval",
  ];

  return initialStages.map((key, index) => ({
    key,
    state: !hasFiles
      ? "waiting"
      : isSubmitting
        ? index === 0
          ? "active"
          : "waiting"
        : index === 0
          ? "done"
          : index === 1
            ? "active"
            : "waiting",
  }));
}

function getUploadWorkflowProgress(stages: UploadStageView[]) {
  const completed = stages.filter((stage) => stage.state === "done").length;
  const active = stages.some((stage) => stage.state === "active") ? 0.5 : 0;

  return ((completed + active) / stages.length) * 100;
}

function getUploadStageLabel(
  labels: (typeof copy)["fr"],
  key: UploadStageKey,
) {
  const labelsByKey: Record<UploadStageKey, string> = {
    received: labels.uploadStageReceived,
    folder: labels.uploadStageFolder,
    convert: labels.uploadStageConvert,
    extract: labels.uploadStageExtract,
    quality: labels.uploadStageQuality,
    approval: labels.uploadStageApproval,
  };

  return labelsByKey[key];
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;

  const units = ["KB", "MB", "GB"];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
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
