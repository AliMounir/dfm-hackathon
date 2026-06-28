"use client";

import { type ComponentType, useEffect, useMemo, useRef, useState } from "react";
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
import { Duotone } from "@/components/ui/duotone";
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
import { AgentDashboardSection } from "@/features/dashboard/components/agent-dashboard-section";
import { ChatPanel } from "@/features/dashboard/components/chat-panel";
import { StaticOverview } from "@/features/dashboard/components/static-overview";
import { DashboardProvider } from "@/features/dashboard/lib/dashboard-context";

const copy = {
  fr: {
    appTitle: "Hazava AI",
    appSubtitle: "Assistant M&E pour DFM",
    overview: "Vue ensemble",
    allProjects: "Tous les projets",
    addProject: "Ajouter un projet",
    addProjectShort: "Ajouter",
    newProjectPlaceholder: "Nom du nouveau projet",
    addProjectSaving: "Enregistrement...",
    addProjectError: "Impossible d'enregistrer le projet dans Supabase.",
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
    workflowWaiting: "En pause",
    workflowSaved: "Enregistre",
    workflowFailed: "Erreur",
    reviewIssues: "Points a verifier",
    reviewIssuesHelp:
      "Corrigez une valeur manquante ou acceptez le point tel quel avant l'import final.",
    noReviewIssues: "Aucun probleme detecte. Vous pouvez valider l'import.",
    editedValue: "Valeur corrigee",
    acceptIssue: "Accepter",
    acceptReviewedData: "Valider l'import",
    savingReview: "Validation...",
    reviewComplete: "Validation enregistree",
    fileLabel: "Fichier",
    sheetLabel: "Feuille",
    rowLabel: "Ligne",
    columnLabel: "Colonne",
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
    addProjectSaving: "Saving...",
    addProjectError: "Could not save the project in Supabase.",
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
    workflowWaiting: "On hold",
    workflowSaved: "Saved",
    workflowFailed: "Failed",
    reviewIssues: "Issues to review",
    reviewIssuesHelp:
      "Edit a missing value or accept the data point as-is before final import.",
    noReviewIssues: "No issues were detected. You can approve the import.",
    editedValue: "Corrected value",
    acceptIssue: "Accept",
    acceptReviewedData: "Approve import",
    savingReview: "Approving...",
    reviewComplete: "Review saved",
    fileLabel: "File",
    sheetLabel: "Sheet",
    rowLabel: "Row",
    columnLabel: "Column",
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
  emerald: "border-line bg-azure-wash text-ink",
  cyan: "border-line bg-azure-wash text-ink",
  amber: "border-line bg-caution-wash text-ink",
  rose: "border-line bg-critical-wash text-ink",
  violet: "border-line bg-indigo-wash text-ink",
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

type ProjectApiRecord = {
  id: string;
  name: string;
  slug?: string;
  folder?: string;
  description?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ProjectsApiResponse = {
  source: "supabase" | "local";
  projects: ProjectApiRecord[];
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
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [syncedProjects, setSyncedProjects] = useState<Project[]>([]);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("summary");
  const [dashboardRefreshKey, setDashboardRefreshKey] = useState(0);

  const t = copy[language];
  const projectList = useMemo(
    () => mergeProjects(projects, syncedProjects),
    [syncedProjects],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadProjects() {
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load projects.");

        const payload = (await response.json()) as ProjectsApiResponse;
        if (cancelled) return;

        setSyncedProjects(
          payload.projects.map((project) => createSyncedProject(project)),
        );
        setProjectError(null);
      } catch {
        if (!cancelled) setProjectError(t.addProjectError);
      }
    }

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [t.addProjectError]);

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

  async function addProject() {
    const trimmedName = newProjectName.trim();

    if (!trimmedName) {
      setIsAdding(false);
      return;
    }

    const id = getUniqueProjectId(slugifyProjectName(trimmedName), projectList);
    setIsSavingProject(true);
    setProjectError(null);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          name: trimmedName,
          folder: `data/projects/${id}`,
          description: "DFM project workspace created from Hazava AI.",
        }),
      });

      const payload = (await response.json()) as {
        project?: ProjectApiRecord;
        error?: string;
      };

      if (!response.ok || !payload.project) {
        throw new Error(payload.error ?? "Could not save project.");
      }

      const project = createSyncedProject(payload.project);
      setSyncedProjects((current) => mergeProjects(current, [project]));
      setSelectedProjectId(project.id);
      setExpandedProjectId(project.id);
      setSelectedSectionId(null);
      setNewProjectName("");
      setIsAdding(false);
    } catch {
      setProjectError(t.addProjectError);
    } finally {
      setIsSavingProject(false);
    }
  }

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside
          className={cn(
            "flex w-full flex-col border-r border-line bg-paper text-ink transition-[width] duration-200 lg:fixed lg:inset-y-0 lg:h-screen",
            isLeftSidebarOpen ? "lg:w-[320px]" : "lg:w-[72px]",
          )}
        >
          <div className={cn("shrink-0 border-b border-line py-5", isLeftSidebarOpen ? "px-5" : "px-2")}>
            <div className={cn("flex items-center gap-3", !isLeftSidebarOpen && "justify-center")}>
              <div className={cn("flex h-10 w-10 items-center justify-center bg-azure text-white", !isLeftSidebarOpen && "hidden")}>
                <HeartPulse className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className={cn("min-w-0 flex-1", !isLeftSidebarOpen && "hidden")}>
                <h1 className="text-lg font-normal tracking-tight text-ink">
                  {t.appTitle}
                </h1>
                <p className="text-xs font-medium text-muted">
                  {t.appSubtitle}
                </p>
              </div>
              <Button
                title={isLeftSidebarOpen ? "Collapse navigation" : "Open navigation"}
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
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
                    "flex w-full items-center gap-3 border-l-[3px] px-3 py-3 text-left text-sm transition-colors",
                    !isLeftSidebarOpen && "justify-center px-0",
                    selectedProjectId === null
                      ? "border-azure bg-azure-wash font-medium text-azure-deep"
                      : "border-transparent text-slate hover:bg-mist hover:text-ink",
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
                          "flex w-full items-center gap-3 border-l-[3px] px-3 py-3 text-left text-sm transition-colors",
                          !isLeftSidebarOpen && "justify-center px-0",
                          active
                            ? "border-azure bg-azure-wash font-medium text-azure-deep"
                            : "border-transparent text-slate hover:bg-mist hover:text-ink",
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
                        <span className={cn("min-w-0 flex-1 truncate", !isLeftSidebarOpen && "hidden")}>
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
                        <div className="mb-2 mt-1 border-l border-line pl-3">
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
                    "flex w-full items-center gap-3 border-l-[3px] border-transparent px-3 py-3 text-left text-sm text-muted transition-colors hover:bg-mist hover:text-ink",
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
                  <div className="flex gap-2 bg-mist p-2">
                    <Input
                      value={newProjectName}
                      disabled={isSavingProject}
                      onChange={(event) => setNewProjectName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void addProject();
                      }}
                      placeholder={t.newProjectPlaceholder}
                    />
                    <Button
                      title={isSavingProject ? t.addProjectSaving : t.addProject}
                      size="icon"
                      className="shrink-0"
                      disabled={isSavingProject}
                      onClick={() => void addProject()}
                    >
                      {isSavingProject ? (
                        <RefreshCw
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <FolderPlus className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                )}
                {isLeftSidebarOpen && projectError && (
                  <p className="rounded-md bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100">
                    {projectError}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cn("shrink-0 border-t border-line", !isLeftSidebarOpen && "px-2")}>
            {isLeftSidebarOpen && (
              <Duotone
                src="/photos/field-clinic.jpg"
                alt="DFM health team at work in Madagascar"
                className="h-28 w-full"
                overlay
              />
            )}
            <div className={cn("p-4", !isLeftSidebarOpen && "px-0")}>
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
              {isLeftSidebarOpen && (
                <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-muted">
                  Doctors for Madagascar
                </p>
              )}
            </div>
          </div>
        </aside>

        <DashboardProvider
          projectId={selectedProject?.id ?? null}
          language={language}
          refreshKey={dashboardRefreshKey}
        >
        <section
          className={cn(
            "flex min-h-screen flex-1 flex-col transition-[margin] duration-200",
            isLeftSidebarOpen ? "lg:ml-[320px]" : "lg:ml-[72px]",
            isAssistantOpen ? "lg:mr-[380px]" : "lg:mr-14",
          )}
        >
          <header className="sticky top-0 z-10 border-b border-line bg-paper/95 px-5 py-5 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <span className="eyebrow mb-3">
                  {selectedProject
                    ? `${language === "fr" ? "Projet" : "Project"} · ${activeDatasetLabel}`
                    : language === "fr"
                      ? "Suivi & évaluation"
                      : "Monitoring & evaluation"}
                </span>
                <h2 className="text-3xl font-light tracking-tight text-ink">
                  {selectedProject
                    ? selectedSection
                      ? `${selectedProject.name} / ${selectedSection.label[language]}`
                      : selectedProject.name
                    : t.overviewTitle}
                </h2>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-slate">
                  {selectedProject
                    ? selectedSectionFiles.length > 0
                      ? `${selectedProject.focus[language]} ${t.attachedFiles}: ${selectedSectionFiles.join(", ")}.`
                      : selectedProject.focus[language]
                    : t.overviewLead}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{t.demoBadge}</Badge>
                  <Badge variant="info">{t.activePeriod}: {t.periodValue}</Badge>
                  <Badge variant="default">
                    {t.activeDataset}: {activeDatasetLabel}
                  </Badge>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-6 px-5 py-6 lg:px-8">
            {selectedProject ? (
              <AgentDashboardSection />
            ) : (
              <>
                <div className="relative overflow-hidden border border-line">
                  <Duotone
                    src="/photos/hero.jpg"
                    alt="Children in a community served by Doctors for Madagascar"
                    className="absolute inset-0 h-full w-full"
                    overlay
                    priority
                  />
                  <div className="relative px-6 py-16 lg:px-10 lg:py-24">
                    <span className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-white/85">
                      <span className="h-0.5 w-6 bg-azure" aria-hidden="true" />
                      Doctors for Madagascar
                    </span>
                    <h2 className="mt-4 max-w-2xl text-4xl font-light leading-tight tracking-tight text-white lg:text-5xl">
                      {language === "fr"
                        ? "Des données claires pour de meilleurs soins."
                        : "Clear data for better care."}
                    </h2>
                  </div>
                </div>
                <StaticOverview onSelect={setSelectedProjectId} language={language} />
              </>
            )}
          </div>
        </section>
        <ChatPanel
          isOpen={isAssistantOpen}
          onToggle={() => setIsAssistantOpen((current) => !current)}
          projectName={selectedProject?.name ?? null}
        />
        </DashboardProvider>
        {isUploadModalOpen && (
          <UploadModal
            labels={t}
            projects={projectList}
            selectedProjectId={selectedProject?.id ?? null}
            onUploadComplete={(projectId) => {
              setSelectedProjectId(projectId);
              setExpandedProjectId(projectId);
              setSelectedSectionId(null);
              setDashboardRefreshKey((current) => current + 1);
            }}
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
      className="flex h-10 items-center justify-center border border-line bg-mist text-slate hover:border-azure hover:bg-azure-wash hover:text-azure-deep"
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
  message?: string | null;
};

type StoredUploadFile = {
  id: string;
  name: string;
  sizeBytes: number;
  kind: string;
  storagePath: string;
  status?: string;
};

type ReviewIssue = {
  id: string;
  fileId: string;
  fileName: string;
  sheetName: string;
  column: string;
  rowNumber: number;
  currentValue: string;
  suggestedValue: string;
  status: "open" | "accepted";
  severity: "high" | "medium" | "low";
  issueType: string;
  message: string;
  suggestedReviewStep: string;
  agentMessageFr: string;
  agentSubtextEn: string;
};

type UploadResponse = {
  batchId: string;
  project: {
    id: string;
    name: string;
    folder: string;
  };
  files: StoredUploadFile[];
  reviewIssues?: ReviewIssue[];
  summary?: {
    status?: string;
  };
  stages: Array<{
    key: UploadStageKey;
    status: UploadStageState;
    message?: string | null;
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
    message: string | null;
  }>;
  files: StoredUploadFile[];
  reviewIssues?: ReviewIssue[];
};

function UploadModal({
  labels,
  projects,
  selectedProjectId,
  onUploadComplete,
  onClose,
}: {
  labels: (typeof copy)["fr"];
  projects: Project[];
  selectedProjectId: string | null;
  onUploadComplete: (projectId: string) => void;
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
  const [submittedProjectId, setSubmittedProjectId] = useState<string | null>(null);
  const [submittedBatchStatus, setSubmittedBatchStatus] = useState<string | null>(
    null,
  );
  const [reviewIssues, setReviewIssues] = useState<ReviewIssue[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const uploadRunIdRef = useRef(0);

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
        setReviewIssues(payload.reviewIssues ?? []);
        setSubmittedStages(
          payload.stages.map((stage) => ({
            key: stage.key,
            state: stage.status,
            message: stage.message,
          })),
        );

        if (payload.batch.status === "failed" && payload.batch.errorMessage) {
          setUploadError(payload.batch.errorMessage);
        }

        if (
          payload.batch.status === "awaiting_approval" ||
          payload.batch.status === "failed" ||
          payload.batch.status === "completed"
        ) {
          window.clearInterval(intervalId);
        }
      } catch (error) {
        if (!cancelled) {
          setUploadError(
            error instanceof Error ? error.message : "Could not refresh workflow.",
          );
        }
      }
    }

    const intervalId = window.setInterval(refreshBatchStatus, 3000);
    refreshBatchStatus();

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
    setSubmittedProjectId(null);
    setSubmittedBatchStatus(null);
    setReviewIssues([]);
    setUploadError(null);
    setReviewError(null);
    uploadRunIdRef.current += 1;
  }

  const hasFiles = uploadedFiles.length > 0;
  const showWorkflow =
    isSubmitting || submittedStages !== null || uploadError !== null;
  const workflowStages = getUploadWorkflowStages(hasFiles, isSubmitting, submittedStages);
  const workflowProgress = getUploadWorkflowProgress(workflowStages);
  const acceptedIssueCount = reviewIssues.filter(
    (issue) => issue.status === "accepted",
  ).length;
  const isReviewReady =
    Boolean(submittedBatchId) &&
    (submittedBatchStatus === "awaiting_approval" ||
      submittedBatchStatus === "completed" ||
      workflowStages.some((stage) => stage.key === "approval" && stage.state === "active"));

  async function submitUpload() {
    if (!hasFiles || isSubmitting) return;

    const runId = uploadRunIdRef.current + 1;
    uploadRunIdRef.current = runId;
    setIsSubmitting(true);
    setUploadError(null);
    setReviewError(null);
    setReviewIssues([]);
    setSubmittedBatchId(null);
    setSubmittedProjectId(null);
    setSubmittedBatchStatus("processing");
    setSubmittedStages(createAnimatedUploadStages("received"));

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

      const finalStages = payload.stages.map((stage) => ({
        key: stage.key,
        state: stage.status,
        message: stage.message ?? null,
      }));
      await playUploadWorkflowAnimation(finalStages, (stages) => {
        if (uploadRunIdRef.current === runId) {
          setSubmittedStages(stages);
        }
      });
      if (uploadRunIdRef.current !== runId) return;

      setSubmittedBatchId(payload.batchId);
      setSubmittedProjectId(payload.project.id);
      setSubmittedBatchStatus(getUploadBatchStatus(payload));
      setReviewIssues(payload.reviewIssues ?? []);
      setReviewError(null);
      setSubmittedStages(finalStages);
      onUploadComplete(payload.project.id);
    } catch (error) {
      if (uploadRunIdRef.current === runId) {
        setUploadError(error instanceof Error ? error.message : "Upload failed.");
      }
    } finally {
      if (uploadRunIdRef.current === runId) {
        setIsSubmitting(false);
      }
    }
  }

  function updateReviewIssue(issueId: string, suggestedValue: string) {
    setReviewIssues((current) =>
      current.map((issue) =>
        issue.id === issueId
          ? { ...issue, suggestedValue, status: "open" }
          : issue,
      ),
    );
    setReviewError(null);
  }

  function acceptReviewIssue(issueId: string) {
    setReviewIssues((current) =>
      current.map((issue) =>
        issue.id === issueId ? { ...issue, status: "accepted" } : issue,
      ),
    );
    setReviewError(null);
  }

  async function approveReview() {
    if (!submittedBatchId || isSavingReview) return;

    setIsSavingReview(true);
    setReviewError(null);

    const reviewedIssues = reviewIssues.map((issue) => ({
      ...issue,
      status: "accepted" as const,
    }));

    try {
      const response = await fetch(`/api/upload-batches/${submittedBatchId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issues: reviewedIssues }),
      });
      const payload = (await response.json()) as
        | { batch: { status: string } }
        | { error?: string };

      if (!response.ok) {
        throw new Error("error" in payload ? payload.error : "Could not save review.");
      }

      setReviewIssues(reviewedIssues);
      setSubmittedBatchStatus("completed");
      if (submittedProjectId) onUploadComplete(submittedProjectId);
      setSubmittedStages((current) =>
        (current ?? workflowStages).map((stage) =>
          stage.key === "approval"
            ? {
                ...stage,
                state: "done",
                message: `${reviewedIssues.length} issue(s) reviewed. Ready for final import.`,
              }
            : stage,
        ),
      );
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Could not save review.",
      );
    } finally {
      setIsSavingReview(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
    >
      <div className="flex h-[min(760px,calc(100vh-3rem))] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-line bg-mist shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-azure-deep">
              {labels.uploadData}
            </p>
            <h2
              id="upload-title"
              className="mt-1 text-lg font-normal tracking-tight text-ink"
            >
              {labels.uploadTitle}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
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
          <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-semibold text-slate">
              {labels.targetProject}
            </span>
            <select
              value={targetProjectId}
              onChange={(event) => setTargetProjectId(event.target.value)}
              className="h-10 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate outline-none ring-azure/30 transition focus:ring-4"
            >
              <option value="auto">{labels.autoAssign}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col rounded-lg border-2 bg-white",
              hasFiles
                ? "border-azure/30"
                : "items-center justify-center border-dashed border-azure/40 px-6 py-10 text-center",
            )}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              handleFiles(event.dataTransfer.files);
            }}
          >
            {!hasFiles ? (
              <>
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-md bg-azure text-white">
                  <Upload className="h-7 w-7" aria-hidden="true" />
                </div>
                <p className="text-xl font-semibold tracking-normal text-ink">
                  {labels.uploadDropTitle}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                  {labels.uploadDropHelp}
                </p>
                <label className="mt-6 inline-flex h-10 cursor-pointer items-center justify-center rounded-md bg-azure px-4 text-sm font-semibold text-white hover:bg-azure/90">
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
                <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {showWorkflow ? labels.workflowPreview : labels.selectedFiles}
                    </p>
                    <p className="mt-1 text-sm text-muted">
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
                    <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate hover:bg-mist">
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
                          className="flex items-center gap-3 rounded-md border border-line bg-mist px-3 py-3"
                        >
                          <FileSpreadsheet
                            className="h-4 w-4 shrink-0 text-azure-deep"
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate">
                              {file.name}
                            </p>
                            <p className="text-xs text-muted">
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
                        className="flex items-center gap-3 rounded-md border border-line bg-mist px-3 py-2"
                      >
                        <FileSpreadsheet
                          className="h-4 w-4 shrink-0 text-azure-deep"
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate">
                            {file.name}
                          </p>
                          <p className="text-xs text-muted">
                            {file.kind} - {file.size}
                          </p>
                        </div>
                      </div>
                    ))}
                    </div>

                    <div>
                    {uploadError && (
                      <div className="mb-3 rounded-md border border-critical bg-critical-wash px-3 py-2 text-sm font-medium text-critical">
                        {uploadError}
                      </div>
                    )}
                    <Progress value={workflowProgress} />
                    <div className="mt-4 space-y-2">
                      {workflowStages.map((stage) => (
                        <div
                          key={stage.key}
                          className="flex items-center gap-3 rounded-md bg-mist px-3 py-2"
                        >
                          <div
                            className={cn(
                              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                              stage.state === "done"
                                ? "bg-azure text-white"
                                : stage.state === "active"
                                  ? "bg-azure text-white"
                                  : stage.state === "error"
                                    ? "bg-critical text-white"
                                  : "bg-line text-muted",
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
                            ) : stage.state === "error" ? (
                              <AlertTriangle
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
                            <p className="text-sm font-semibold text-slate">
                              {getUploadStageLabel(labels, stage.key)}
                            </p>
                            <p className="text-xs text-muted">
                              {stage.message ??
                                (stage.state === "done"
                                  ? labels.workflowDone
                                  : stage.state === "active"
                                    ? labels.workflowActive
                                    : stage.state === "error"
                                      ? labels.workflowFailed
                                      : labels.workflowWaiting)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {isReviewReady ? (
                      <div className="mt-4 rounded-md border border-caution bg-paper p-3">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-ink">
                              {labels.reviewIssues}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-muted">
                              {reviewIssues.length > 0
                                ? labels.reviewIssuesHelp
                                : labels.noReviewIssues}
                            </p>
                          </div>
                          {reviewIssues.length > 0 && (
                            <Badge variant="warning">
                              {acceptedIssueCount}/{reviewIssues.length}
                            </Badge>
                          )}
                        </div>

                        {reviewError && (
                          <div className="mb-3 rounded-md border border-critical bg-critical-wash px-3 py-2 text-xs font-medium text-critical">
                            {reviewError}
                          </div>
                        )}

                        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                          {reviewIssues.map((issue) => (
                            <div
                              key={issue.id}
                              className={cn(
                                "rounded-md border px-3 py-2",
                                issue.status === "accepted"
                                  ? "border-positive bg-positive-wash"
                                  : "border-line bg-mist",
                              )}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <SeverityBadge severity={issue.severity} count={1} />
                                <Badge variant="neutral">
                                  {issue.issueType.replace(/_/g, " ")}
                                </Badge>
                                <span className="text-xs font-semibold text-slate">
                                  {labels.rowLabel} {issue.rowNumber}
                                </span>
                                {issue.column && (
                                  <span className="text-xs text-muted">
                                    {labels.columnLabel}: {issue.column}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-xs font-semibold leading-5 text-slate">
                                {issue.agentMessageFr || issue.message}
                              </p>
                              <p className="mt-0.5 text-xs leading-5 text-muted">
                                EN: {issue.agentSubtextEn || issue.suggestedReviewStep}
                              </p>
                              <p className="mt-1 truncate text-xs text-muted">
                                {labels.fileLabel}: {issue.fileName} / {labels.sheetLabel}:{" "}
                                {issue.sheetName}
                              </p>
                              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                                <Input
                                  value={issue.suggestedValue}
                                  onChange={(event) =>
                                    updateReviewIssue(issue.id, event.target.value)
                                  }
                                  placeholder={labels.editedValue}
                                  disabled={submittedBatchStatus === "completed"}
                                  className="h-8 text-xs"
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={
                                    issue.status === "accepted" ? "secondary" : "outline"
                                  }
                                  disabled={submittedBatchStatus === "completed"}
                                  onClick={() => acceptReviewIssue(issue.id)}
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                                  {labels.acceptIssue}
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                          <p className="text-xs font-semibold text-muted">
                            {submittedBatchStatus === "completed"
                              ? labels.reviewComplete
                              : `${acceptedIssueCount}/${reviewIssues.length} ${labels.workflowDone.toLowerCase()}`}
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !submittedBatchId ||
                              submittedBatchStatus === "completed" ||
                              isSavingReview
                            }
                            onClick={approveReview}
                          >
                            {isSavingReview
                              ? labels.savingReview
                              : labels.acceptReviewedData}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {labels.close}
          </Button>
          <Button
            className="bg-azure text-white hover:bg-azure-deep"
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
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-14 flex-col border-l border-line bg-white shadow-sm lg:flex">
        <button
          type="button"
          aria-label={isFrench ? "Ouvrir l'assistant" : "Open assistant"}
          title={isFrench ? "Ouvrir l'assistant" : "Open assistant"}
          className="flex h-14 items-center justify-center border-b border-line text-muted hover:bg-mist hover:text-ink"
          onClick={onToggle}
        >
          <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted">
            {isFrench ? "Assistant" : "Assistant"}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-[380px] flex-col border-l border-line bg-white shadow-sm lg:flex">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-azure text-white">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-ink">
              {isFrench ? "Assistant M&E" : "M&E Assistant"}
            </h2>
            <p className="truncate text-xs text-muted">{contextLabel}</p>
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

      <div className="shrink-0 border-b border-line p-4">
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

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-mist p-4">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            {isFrench ? "Suggestions" : "Suggestions"}
          </p>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-left text-sm leading-5 text-slate hover:border-azure/50 hover:bg-azure/10"
              onClick={() => setDraft(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-line bg-white p-4">
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
        <p className="mt-2 text-xs leading-5 text-muted">
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
      className="flex h-10 items-center justify-center gap-2 rounded-md border border-line bg-white text-xs font-semibold text-slate hover:bg-mist"
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
          "max-w-[88%] px-3 py-2 text-sm leading-6",
          isAssistant
            ? "border border-line bg-paper text-slate"
            : "bg-azure text-white",
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
          "flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors",
          active
            ? "bg-azure-wash font-medium text-azure-deep"
            : hasActiveChild
              ? "text-ink"
              : "text-muted hover:bg-mist hover:text-ink",
          depth > 0 && "pl-8",
        )}
        onClick={() => onSelect(section.id)}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
        <span className="min-w-0 flex-1 truncate">
          {section.label[language]}
        </span>
        {section.files.length > 0 && (
          <span className="bg-mist px-1.5 py-0.5 text-[10px] font-medium text-muted">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="filters-title"
    >
      <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line bg-mist shadow-2xl">
        <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-azure-deep">
              {labels.filterContext}: {selectedProjectName}
            </p>
            <h2
              id="filters-title"
              className="mt-1 text-lg font-normal tracking-tight text-ink"
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
            <label className="space-y-2 text-sm font-semibold text-slate">
              <span>{labels.startDate}</span>
              <Input type="date" defaultValue="2025-12-27" />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate">
              <span>{labels.endDate}</span>
              <Input type="date" defaultValue="2026-06-27" />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-ink">
              {labels.periodType}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[labels.monthly, labels.quarterly, labels.semester, labels.annual].map(
                (period, index) => (
                  <label
                    key={period}
                    className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-3 text-sm font-semibold text-slate"
                  >
                    <input
                      type="radio"
                      name="period-type"
                      defaultChecked={index === 0}
                      className="h-4 w-4 accent-azure"
                    />
                    {period}
                  </label>
                ),
              )}
            </div>
          </div>

          {filterOptions.length > 0 && (
            <div>
              <p className="mb-3 text-sm font-semibold text-ink">
                {selectedProjectName}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {filterOptions.map((option) => (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-3 text-sm font-semibold text-slate"
                  >
                    <input
                      type="checkbox"
                      defaultChecked
                      className="h-4 w-4 accent-azure"
                    />
                    {option}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line bg-white px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            {labels.close}
          </Button>
          <Button className="bg-azure text-white hover:bg-azure-deep" onClick={onClose}>
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

function mergeProjects(baseProjects: Project[], incomingProjects: Project[]) {
  const projectMap = new globalThis.Map<string, Project>(
    baseProjects.map((project) => [project.id, project]),
  );

  for (const project of incomingProjects) {
    if (!projectMap.has(project.id)) {
      projectMap.set(project.id, project);
    }
  }

  return Array.from(projectMap.values());
}

function createSyncedProject(record: ProjectApiRecord): Project {
  return {
    id: record.id,
    name: record.name,
    folder: record.folder ?? `data/projects/${record.id}`,
    accent: "emerald",
    focus: {
      fr:
        record.description ??
        "Nouvel espace projet pret a recevoir des exports et indicateurs.",
      en:
        record.description ??
        "New project workspace ready for exports and indicators.",
    },
    dataSources: ["Excel", "REDCap", "DHIS2"],
    status: { fr: "Synchronise", en: "Synced" },
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
}

function slugifyProjectName(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "project"
  );
}

function getUniqueProjectId(baseId: string, currentProjects: Project[]) {
  const currentIds = new Set(currentProjects.map((project) => project.id));
  if (!currentIds.has(baseId)) return baseId;

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (currentIds.has(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
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

  return initialStages.map((key, index) => {
    let state: UploadStageState = "waiting";
    if (hasFiles && index === 0) state = "active";

    return {
      key,
      state,
      message: null,
    };
  });
}

function getUploadWorkflowProgress(stages: UploadStageView[]) {
  const completed = stages.filter((stage) => stage.state === "done").length;
  const active = stages.some((stage) => stage.state === "active") ? 0.5 : 0;

  return ((completed + active) / stages.length) * 100;
}

function createAnimatedUploadStages(
  activeKey: UploadStageKey,
  finalStages: UploadStageView[] = [],
) {
  const order = getUploadStageOrder();
  const activeIndex = order.indexOf(activeKey);

  return order.map((key, index) => {
    const finalStage = finalStages.find((stage) => stage.key === key);
    let state: UploadStageState = "waiting";

    if (index < activeIndex) state = "done";
    if (index === activeIndex) state = "active";

    return {
      key,
      state,
      message: index < activeIndex ? finalStage?.message ?? null : null,
    };
  });
}

async function playUploadWorkflowAnimation(
  finalStages: UploadStageView[],
  updateStages: (stages: UploadStageView[]) => void,
) {
  const order = getUploadStageOrder();

  for (const key of order) {
    const finalStage = finalStages.find((stage) => stage.key === key);
    updateStages(createAnimatedUploadStages(key, finalStages));
    await waitForUploadStage(550);

    if (finalStage?.state === "active") {
      updateStages(finalStages);
      await waitForUploadStage(350);
      return;
    }

    updateStages(
      order.map((stageKey, index) => {
        const finalItem = finalStages.find((stage) => stage.key === stageKey);
        const currentIndex = order.indexOf(key);

        return {
          key: stageKey,
          state:
            index <= currentIndex
              ? finalItem?.state === "error"
                ? "error"
                : "done"
              : "waiting",
          message: index <= currentIndex ? finalItem?.message ?? null : null,
        };
      }),
    );
    await waitForUploadStage(250);
  }

  updateStages(finalStages);
}

function waitForUploadStage(milliseconds: number) {
  const delay = Math.floor(120 + Math.random() * Math.max(milliseconds - 120, 0));

  return new Promise((resolve) => {
    window.setTimeout(resolve, delay);
  });
}

function getUploadBatchStatus(payload: UploadResponse) {
  if (payload.summary?.status) return payload.summary.status;

  const approvalStage = payload.stages.find((stage) => stage.key === "approval");
  if (approvalStage?.status === "active") return "awaiting_approval";
  if (approvalStage?.status === "done") return "completed";

  return "processing";
}

function getUploadStageOrder(): UploadStageKey[] {
  return ["received", "folder", "convert", "extract", "quality", "approval"];
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
    <div className="rounded-md border border-line bg-mist p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-paper text-azure-deep">
        <Icon className="h-4 w-4" aria-hidden={true} />
      </div>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}
