export type Language = "fr" | "en";

export type LocalizedText = Record<Language, string>;

export type MetricTone = "emerald" | "cyan" | "amber" | "rose" | "violet";

export type Metric = {
  id: string;
  label: LocalizedText;
  value: string;
  helper: LocalizedText;
  tone: MetricTone;
};

export type QualityIssue = {
  id: string;
  severity: "high" | "medium" | "low";
  title: LocalizedText;
  count: number;
  whyItMatters: LocalizedText;
  action: LocalizedText;
};

export type Insight = {
  id: string;
  title: LocalizedText;
  body: LocalizedText;
  tag: LocalizedText;
};

export type MonthlyPoint = {
  month: string;
  services: number;
  risks: number;
  target: number;
};

export type SitePoint = {
  site: string;
  value: number;
  change: number;
};

export type Project = {
  id: string;
  name: string;
  folder: string;
  focus: LocalizedText;
  dataSources: string[];
  status: LocalizedText;
  accent: MetricTone;
  metrics: Metric[];
  monthly: MonthlyPoint[];
  sites: SitePoint[];
  qualityIssues: QualityIssue[];
  insights: Insight[];
  suggestedQuestions: LocalizedText[];
  story: LocalizedText;
};

export const projects: Project[] = [
  {
    id: "mchp",
    name: "MCHP",
    folder: "data/projects/mchp",
    accent: "emerald",
    focus: {
      fr: "Suivi des activités d'echographie, des cas compliques et des parcours de soins maternels.",
      en: "Tracking ultrasound activity, complicated cases, and maternal care pathways.",
    },
    dataSources: ["REDCap", "Excel MCHP", "Dashboard DFM"],
    status: { fr: "Donnees attachees", en: "Attached data" },
    metrics: [
      {
        id: "ultrasounds",
        label: { fr: "Echographies realisees", en: "Ultrasounds performed" },
        value: "10,169",
        helper: { fr: "periode du tableau de bord", en: "dashboard report period" },
        tone: "emerald",
      },
      {
        id: "beneficiaries",
        label: { fr: "Femmes enceintes beneficiaires", en: "Pregnant women reached" },
        value: "8,744",
        helper: { fr: "beneficiaires uniques", en: "unique beneficiaries" },
        tone: "violet",
      },
      {
        id: "first_scan",
        label: { fr: "Premiere echographie", en: "First ultrasound" },
        value: "6,949",
        helper: { fr: "nouveaux contacts de grossesse", en: "new pregnancy contacts" },
        tone: "cyan",
      },
      {
        id: "complicated",
        label: { fr: "Cas compliques", en: "Complicated cases" },
        value: "4.5%",
        helper: { fr: "n = 390 a verifier", en: "n = 390 to review" },
        tone: "amber",
      },
    ],
    monthly: [
      { month: "Jan", services: 1180, risks: 42, target: 1300 },
      { month: "Feb", services: 1390, risks: 48, target: 1300 },
      { month: "Mar", services: 1710, risks: 57, target: 1500 },
      { month: "Apr", services: 1620, risks: 69, target: 1500 },
      { month: "May", services: 1825, risks: 91, target: 1700 },
      { month: "Jun", services: 2444, risks: 83, target: 1700 },
    ],
    sites: [
      { site: "Manambaro", value: 5604, change: 8 },
      { site: "Ejeda", value: 4565, change: -4 },
      { site: "Behavandra", value: 812, change: 13 },
      { site: "Belafike", value: 735, change: -9 },
    ],
    qualityIssues: [
      {
        id: "missing-follow-up",
        severity: "high",
        title: {
          fr: "Suivis sans identifiant patient complet",
          en: "Follow-ups without complete patient identifier",
        },
        count: 124,
        whyItMatters: {
          fr: "Le lien entre la premiere echographie et le suivi peut etre perdu, ce qui fragilise l'analyse du parcours de soins.",
          en: "The link between first scan and follow-up may be lost, weakening care pathway analysis.",
        },
        action: {
          fr: "Verifier les QR codes, les noms et les dates avant le rapport mensuel.",
          en: "Review QR codes, names, and dates before the monthly report.",
        },
      },
      {
        id: "placeholder-values",
        severity: "medium",
        title: {
          fr: "Valeurs '---' dans des champs descriptifs",
          en: "'---' values in descriptive fields",
        },
        count: 318,
        whyItMatters: {
          fr: "Ces valeurs peuvent etre normales pour certains champs, mais elles peuvent aussi cacher une information clinique manquante.",
          en: "These values may be valid for some fields, but can also hide missing clinical detail.",
        },
        action: {
          fr: "Classer les champs ou '---' est acceptable et ceux ou une explication est attendue.",
          en: "Classify fields where '---' is acceptable versus fields that need an explanation.",
        },
      },
      {
        id: "facility-spelling",
        severity: "low",
        title: {
          fr: "Noms de CSB a harmoniser",
          en: "Facility names to harmonize",
        },
        count: 17,
        whyItMatters: {
          fr: "Une variation d'orthographe peut diviser artificiellement les indicateurs d'un meme CSB.",
          en: "Spelling variation can artificially split indicators for the same facility.",
        },
        action: {
          fr: "Utiliser une liste de reference des CSB pour standardiser les exports.",
          en: "Use a facility reference list to standardize exports.",
        },
      },
    ],
    insights: [
      {
        id: "seasonal-access",
        tag: { fr: "Risque saisonnier", en: "Seasonal risk" },
        title: {
          fr: "Surveiller les baisses d'activite pendant les periodes de pluie",
          en: "Watch for activity drops during rainy periods",
        },
        body: {
          fr: "Si les consultations diminuent alors que les cas compliques restent stables ou augmentent, cela peut indiquer un probleme d'acces plutot qu'une baisse du besoin.",
          en: "If consultations fall while complicated cases stay stable or rise, that may suggest access barriers rather than reduced need.",
        },
      },
      {
        id: "first-scan-gap",
        tag: { fr: "Continuite des soins", en: "Continuity of care" },
        title: {
          fr: "Comparer premieres echographies et suivis par CSB",
          en: "Compare first scans and follow-ups by facility",
        },
        body: {
          fr: "Un CSB avec beaucoup de premieres echographies mais peu de suivis merite une verification avec l'equipe terrain.",
          en: "A facility with many first scans but few follow-ups deserves a field-team review.",
        },
      },
    ],
    suggestedQuestions: [
      {
        fr: "Quels CSB ont le plus de cas compliques ce mois-ci ?",
        en: "Which facilities have the most complicated cases this month?",
      },
      {
        fr: "Quelles donnees dois-je corriger avant le rapport bailleur ?",
        en: "Which data should I correct before the donor report?",
      },
      {
        fr: "Est-ce que l'activite baisse dans certaines zones ?",
        en: "Is activity declining in any areas?",
      },
    ],
    story: {
      fr: "Le projet MCHP montre une forte couverture d'echographies avec 8,744 femmes enceintes atteintes. L'assistant met en avant les zones ou les suivis, les cas compliques et la qualite des identifiants doivent etre verifies avant interpretation.",
      en: "The MCHP project shows strong ultrasound coverage with 8,744 pregnant women reached. The assistant highlights where follow-ups, complicated cases, and identifier quality should be reviewed before interpretation.",
    },
  },
  {
    id: "soameva",
    name: "SOAMEVA",
    folder: "data/projects/soameva",
    accent: "cyan",
    focus: {
      fr: "Coordination communautaire, indicateurs de sensibilisation et orientation vers les services.",
      en: "Community coordination, awareness indicators, and referrals to services.",
    },
    dataSources: ["Indicateurs projet", "Exports terrain"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("3,420", "86%", "214", "12"),
    monthly: demoMonthly(580, 34),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "SOAMEVA peut utiliser l'assistant pour transformer les donnees communautaires en messages clairs sur la couverture, les orientations et les zones a renforcer.",
      en: "SOAMEVA can use the assistant to turn community data into clear messages about coverage, referrals, and areas needing support.",
    },
  },
  {
    id: "miray-tb-parsite",
    name: "MIRAY TB PARSITE",
    folder: "data/projects/miray-tb-parsite",
    accent: "rose",
    focus: {
      fr: "Analyse TB par site, suivi des cohortes et alertes de completion.",
      en: "TB site-level analysis, cohort follow-up, and completion alerts.",
    },
    dataSources: ["Cohortes TB", "DHIS2", "Registres"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("1,284", "74%", "96", "18"),
    monthly: demoMonthly(320, 29),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "MIRAY TB PARSITE peut prioriser les sites avec donnees incompletes, pertes de suivi ou ecarts entre notification et traitement.",
      en: "MIRAY TB PARSITE can prioritize sites with incomplete data, loss to follow-up, or gaps between notification and treatment.",
    },
  },
  {
    id: "miray-tb-general",
    name: "MIRAY TB GENERAL",
    folder: "data/projects/miray-tb-general",
    accent: "amber",
    focus: {
      fr: "Vue globale TB, tendances de depistage, traitement et resultats.",
      en: "Overall TB view, screening, treatment, and outcome trends.",
    },
    dataSources: ["Cohortes TB", "DHIS2", "Rapports mensuels"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("5,760", "81%", "433", "27"),
    monthly: demoMonthly(760, 44),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "La vue generale TB aide a repérer les ruptures de tendance et a preparer des explications coherentes pour les equipes et partenaires.",
      en: "The general TB view helps spot trend breaks and prepare consistent explanations for teams and partners.",
    },
  },
  {
    id: "mafy",
    name: "MAFY",
    folder: "data/projects/mafy",
    accent: "violet",
    focus: {
      fr: "Suivi des activites de sante communautaire et apprentissage interne.",
      en: "Community health activity monitoring and internal learning.",
    },
    dataSources: ["Exports REDCap", "Indicateurs projet"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("2,910", "68%", "142", "9"),
    monthly: demoMonthly(460, 22),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "MAFY peut utiliser les controles automatiques pour fiabiliser les indicateurs avant les reunions de pilotage.",
      en: "MAFY can use automated checks to make indicators more reliable before steering meetings.",
    },
  },
  {
    id: "tia-longo",
    name: "TIA LONGO",
    folder: "data/projects/tia-longo",
    accent: "emerald",
    focus: {
      fr: "Indicateurs de proximite, besoins des communautes et suivi des activites.",
      en: "Local indicators, community needs, and activity monitoring.",
    },
    dataSources: ["Rapports projet", "Registres terrain"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("4,180", "79%", "205", "16"),
    monthly: demoMonthly(630, 31),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "TIA LONGO peut transformer ses donnees de terrain en syntheses courtes pour les coordinateurs et partenaires locaux.",
      en: "TIA LONGO can turn field data into short summaries for coordinators and local partners.",
    },
  },
  {
    id: "profess",
    name: "PROFESS",
    folder: "data/projects/profess",
    accent: "cyan",
    focus: {
      fr: "Qualite des services, formation, supervision et suivi des ameliorations.",
      en: "Service quality, training, supervision, and improvement tracking.",
    },
    dataSources: ["Supervision", "5S", "Rapports qualite"],
    status: { fr: "Structure prete", en: "Structure ready" },
    metrics: demoMetrics("1,970", "72%", "88", "11"),
    monthly: demoMonthly(390, 18),
    sites: demoSites(),
    qualityIssues: getDemoQualityIssues(),
    insights: getDemoInsights(),
    suggestedQuestions: getDemoQuestions(),
    story: {
      fr: "PROFESS peut relier les donnees de supervision aux plans d'action et suivre les ameliorations visibles dans le temps.",
      en: "PROFESS can connect supervision data to action plans and track visible improvements over time.",
    },
  },
];

export const overviewMonthly: MonthlyPoint[] = [
  { month: "Jan", services: 4150, risks: 190, target: 4300 },
  { month: "Feb", services: 4520, risks: 205, target: 4300 },
  { month: "Mar", services: 4980, risks: 231, target: 4700 },
  { month: "Apr", services: 5120, risks: 249, target: 4700 },
  { month: "May", services: 5530, risks: 286, target: 5200 },
  { month: "Jun", services: 6040, risks: 301, target: 5200 },
];

export const overviewMetrics: Metric[] = [
  {
    id: "projects",
    label: { fr: "Projets DFM", en: "DFM projects" },
    value: "7",
    helper: { fr: "espaces de donnees prepares", en: "prepared data spaces" },
    tone: "emerald",
  },
  {
    id: "sources",
    label: { fr: "Sources connectables", en: "Connectable sources" },
    value: "4",
    helper: { fr: "REDCap, DHIS2, Excel, registres", en: "REDCap, DHIS2, Excel, registers" },
    tone: "cyan",
  },
  {
    id: "alerts",
    label: { fr: "Alertes qualite demo", en: "Demo quality alerts" },
    value: "27",
    helper: { fr: "a remplacer par les vrais controles", en: "replace with real checks" },
    tone: "amber",
  },
  {
    id: "reports",
    label: { fr: "Rapports generables", en: "Report outputs" },
    value: "3",
    helper: { fr: "equipe, bailleur, recherche", en: "team, donor, research" },
    tone: "violet",
  },
];

function getDemoQualityIssues(): QualityIssue[] {
  return [
    {
      id: "missing-values",
      severity: "medium",
      title: { fr: "Champs obligatoires manquants", en: "Missing required fields" },
      count: 24,
      whyItMatters: {
        fr: "Les indicateurs peuvent etre sous-estimes si les lignes incompletes sont exclues.",
        en: "Indicators may be underestimated if incomplete rows are excluded.",
      },
      action: {
        fr: "Completer les champs critiques ou documenter la raison de l'absence.",
        en: "Complete critical fields or document the reason for missingness.",
      },
    },
    {
      id: "late-reporting",
      severity: "low",
      title: { fr: "Rapports saisis en retard", en: "Late reporting entries" },
      count: 9,
      whyItMatters: {
        fr: "Les tendances recentes peuvent paraitre plus faibles que la realite.",
        en: "Recent trends can look weaker than reality.",
      },
      action: {
        fr: "Verifier les dates de saisie avant de commenter une baisse.",
        en: "Check entry dates before explaining a decline.",
      },
    },
  ];
}

function getDemoInsights(): Insight[] {
  return [
    {
      id: "gap",
      tag: { fr: "Ecart de service", en: "Service gap" },
      title: {
        fr: "Identifier les zones avec activite sous la cible",
        en: "Identify areas below target",
      },
      body: {
        fr: "L'assistant compare les volumes mensuels, la cible et les alertes qualite pour orienter la discussion avec l'equipe.",
        en: "The assistant compares monthly volumes, target, and quality alerts to guide team discussion.",
      },
    },
    {
      id: "story",
      tag: { fr: "Narratif", en: "Storytelling" },
      title: {
        fr: "Preparer une explication courte pour les partenaires",
        en: "Prepare a short partner explanation",
      },
      body: {
        fr: "Les donnees selectionnees peuvent etre converties en resume simple, avec prudence sur les limites de qualite.",
        en: "Selected data can be turned into a simple summary, with care around quality limitations.",
      },
    },
  ];
}

function getDemoQuestions(): LocalizedText[] {
  return [
    {
      fr: "Quels indicateurs ont change depuis le mois dernier ?",
      en: "Which indicators changed since last month?",
    },
    {
      fr: "Quels sites demandent une verification prioritaire ?",
      en: "Which sites need priority review?",
    },
    {
      fr: "Peux-tu generer une synthese pour une reunion projet ?",
      en: "Can you generate a summary for a project meeting?",
    },
  ];
}

function demoMetrics(a: string, b: string, c: string, d: string): Metric[] {
  return [
    {
      id: "activity",
      label: { fr: "Activites enregistrees", en: "Recorded activities" },
      value: a,
      helper: { fr: "donnees demo", en: "demo data" },
      tone: "emerald",
    },
    {
      id: "coverage",
      label: { fr: "Couverture estimee", en: "Estimated coverage" },
      value: b,
      helper: { fr: "a valider", en: "to validate" },
      tone: "cyan",
    },
    {
      id: "gaps",
      label: { fr: "Ecarts a explorer", en: "Gaps to explore" },
      value: c,
      helper: { fr: "lignes ou sites", en: "rows or sites" },
      tone: "amber",
    },
    {
      id: "alerts",
      label: { fr: "Alertes prioritaires", en: "Priority alerts" },
      value: d,
      helper: { fr: "controles qualite", en: "quality checks" },
      tone: "rose",
    },
  ];
}

function demoMonthly(base: number, riskBase: number): MonthlyPoint[] {
  return [
    { month: "Jan", services: base - 90, risks: riskBase, target: base },
    { month: "Feb", services: base + 30, risks: riskBase + 4, target: base },
    { month: "Mar", services: base + 120, risks: riskBase + 8, target: base + 80 },
    { month: "Apr", services: base + 80, risks: riskBase + 12, target: base + 80 },
    { month: "May", services: base + 180, risks: riskBase + 16, target: base + 130 },
    { month: "Jun", services: base + 220, risks: riskBase + 13, target: base + 130 },
  ];
}

function demoSites(): SitePoint[] {
  return [
    { site: "Manambaro", value: 72, change: 6 },
    { site: "Ejeda", value: 64, change: -5 },
    { site: "Ambovombe", value: 58, change: 3 },
    { site: "Tsihombe", value: 51, change: -8 },
  ];
}
