import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
  createDashboardPlan,
  createOverviewDashboardPlan,
  findProject,
} from "@/lib/dashboard-api";
import { backendResponse, fetchBackendApi } from "@/lib/backend-proxy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DashboardPlan, Section } from "@/features/dashboard/lib/types";

export const runtime = "nodejs";
// The dashboard agent (LLM call on Railway) can take 20-30s. Without this,
// Vercel's default function timeout (~10-15s) kills the proxy and the UI falls
// back to the stale plan. 60s is the Hobby ceiling and ample on Pro.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  if (projectId === "overview") {
    return NextResponse.json(createOverviewDashboardPlan());
  }

  // 1) Preferred: the live agent dashboard from the backend (Railway). The
  //    backend returns its own rule-based plan if the LLM is unavailable, so a
  //    200 here is always the best answer we can give.
  const backend = await fetchBackendApi(`/projects/${projectId}/dashboard`);
  if (backend?.ok) {
    return backendResponse(backend);
  }

  // 2) Fallbacks only when the backend is unreachable (not configured / down).
  const project = findProject(projectId);
  if (project) {
    return NextResponse.json(createDashboardPlan(project), {
      headers: {
        "x-hazava-backend": "local-fallback",
      },
    });
  }

  try {
    const plan = await createSupabaseProjectDashboard(projectId);
    if (plan) {
      return NextResponse.json(plan, {
        headers: {
          "x-hazava-backend": "local-fallback",
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build project dashboard.",
      },
      { status: 500 },
    );
  }

  // 3) Surface the backend error if we had a (non-ok) response.
  if (backend) return backendResponse(backend);

  return NextResponse.json({ error: "Project not found" }, { status: 404 });
}

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
};

type ProjectFileRow = {
  id: string;
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  kind: string;
  status: string;
  size_bytes: number;
  created_at: string;
};

type ExtractionArtifact = {
  originalFilename?: string;
  detectedKind?: string;
  sheetCount?: number;
  rowCount?: number;
  columnCount?: number;
  missingCells?: number;
  missingColumns?: number;
  sheets?: Array<{
    name?: string;
    rowCount?: number;
    columnCount?: number;
    headers?: string[];
    missingByColumn?: Array<{
      column?: string;
      missingCount?: number;
      missingPercent?: number;
    }>;
  }>;
  reviewIssues?: Array<{
    severity?: "high" | "medium" | "low";
    issueType?: string;
    column?: string;
  }>;
};

type UploadedRecord = {
  fileName: string;
  sheetName: string;
  values: Record<string, string | number | boolean | Date | null>;
};

type SemanticProfile = {
  totalSensitized: number;
  sessions: number;
  newHtaCases: number;
  returningHtaCases: number;
  avcCases: number;
  postAvcCases: number;
  validCards: number;
  receivedCards: number;
  totalPatients: number;
  sensitizedWomen: number;
  sensitizedMen: number;
  patientWomen: number;
  patientMen: number;
  referrals: number;
  activityByMonth: Map<string, number>;
  activityBySite: Map<string, number>;
  htaBySite: Map<string, number>;
  records: number;
};

async function createSupabaseProjectDashboard(
  projectId: string,
): Promise<DashboardPlan | null> {
  const supabase = createSupabaseServerClient();
  const projectResult = await supabase
    .from("projects")
    .select("id,name,description")
    .eq("id", projectId)
    .maybeSingle<ProjectRow>();

  if (projectResult.error) throw new Error(projectResult.error.message);
  if (!projectResult.data?.description) return null;

  const filesResult = await supabase
    .from("project_files")
    .select(
      "id,original_filename,storage_bucket,storage_path,kind,status,size_bytes,created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (filesResult.error) throw new Error(filesResult.error.message);

  const files = (filesResult.data ?? []) as ProjectFileRow[];
  const sourceFiles = dedupeProjectFiles(files.filter((file) => !isInternalArtifact(file)));
  const extractionFiles = dedupeProjectFiles(
    files.filter((file) => file.status === "extracted"),
  );
  const artifacts = (
    await Promise.all(
      extractionFiles.map((file) => loadExtractionArtifact(supabase, file)),
    )
  ).filter((artifact): artifact is ExtractionArtifact => Boolean(artifact));
  const records = (
    await Promise.all(sourceFiles.map((file) => loadSourceRecords(supabase, file)))
  ).flat();
  const profile = createSemanticProfile(records);

  return buildUploadedProjectPlan(projectResult.data, sourceFiles, artifacts, profile);
}

async function loadExtractionArtifact(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  file: ProjectFileRow,
) {
  const result = await supabase.storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (result.error) return null;

  try {
    return JSON.parse(await result.data.text()) as ExtractionArtifact;
  } catch {
    return null;
  }
}

function buildUploadedProjectPlan(
  project: ProjectRow,
  sourceFiles: ProjectFileRow[],
  artifacts: ExtractionArtifact[],
  profile: SemanticProfile,
): DashboardPlan {
  const rowCount = artifacts.reduce(
    (sum, artifact) => sum + numberOrZero(artifact.rowCount),
    0,
  );
  const sheetCount = artifacts.reduce(
    (sum, artifact) => sum + numberOrZero(artifact.sheetCount),
    0,
  );
  const missingCells = artifacts.reduce(
    (sum, artifact) => sum + numberOrZero(artifact.missingCells),
    0,
  );
  const reviewIssueCount = artifacts.reduce(
    (sum, artifact) => sum + (artifact.reviewIssues?.length ?? 0),
    0,
  );
  const qualityTone = reviewIssueCount > 0 || missingCells > 0 ? "amber" : "emerald";
  const kpis = buildSemanticKpis(profile, {
    sourceFiles: sourceFiles.length,
    rowCount,
    sheetCount,
    missingCells,
    reviewIssueCount,
  });
  const sections: Section[] = buildSemanticSections(profile);

  if (sections.length === 0) {
    sections.push({
      id: "uploaded-rows-by-file",
      tone: "emerald",
      type: "bar",
      title: { fr: "Lignes extraites par fichier", en: "Rows extracted by file" },
      insight: {
        fr: "Resume le volume de donnees lu depuis les fichiers importes.",
        en: "Summarizes the volume read from the uploaded files.",
      },
      data: artifacts.map((artifact) => ({
        label: shortenLabel(artifact.originalFilename ?? "Fichier"),
        value: numberOrZero(artifact.rowCount),
      })),
    });
  }

  const missingByColumn = getMissingByColumn(artifacts);
  if (missingByColumn.length > 0) {
    sections.push({
      id: "uploaded-missing-by-column",
      tone: "rose",
      type: "bar",
      title: { fr: "Cellules manquantes par champ", en: "Missing cells by field" },
      insight: {
        fr: "Regroupe les champs ou les valeurs manquantes sont les plus visibles.",
        en: "Groups the fields where missing values are most visible.",
      },
      data: missingByColumn.slice(0, 8),
    });
  }
  if (reviewIssueCount > 0) {
    sections.push({
      id: "uploaded-quality-issues",
      tone: qualityTone,
      type: "bar",
      title: { fr: "Alertes qualite", en: "Quality alerts" },
      insight: {
        fr: "Resume les types de controles prioritaires avant validation.",
        en: "Summarizes priority checks before validation.",
      },
      data: getReviewIssueTopics(artifacts).slice(0, 8),
    });
  }

  return {
    project_id: project.id,
    generated_by: "supabase-upload",
    description: {
      fr:
        sourceFiles.length > 0
          ? `${project.name} est alimente par ${sourceFiles.length} fichier(s) importe(s) dans Supabase.`
          : `${project.name} est pret a recevoir des fichiers importes.`,
      en:
        sourceFiles.length > 0
          ? `${project.name} is powered by ${sourceFiles.length} uploaded file(s) in Supabase.`
          : `${project.name} is ready for uploaded files.`,
    },
    kpis,
    sections,
  };
}

async function loadSourceRecords(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  file: ProjectFileRow,
): Promise<UploadedRecord[]> {
  if (file.kind !== "excel" && file.kind !== "csv") return [];

  const result = await supabase.storage
    .from(file.storage_bucket)
    .download(file.storage_path);

  if (result.error) return [];

  const buffer = Buffer.from(await result.data.arrayBuffer());
  if (file.kind === "excel") {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

    return workbook.SheetNames.flatMap((sheetName) => {
      const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | Date | null>>(
        workbook.Sheets[sheetName],
        { header: 1, raw: false, defval: null },
      );
      return rowsToRecords(file.original_filename, sheetName, rows);
    });
  }

  const text = buffer.toString("utf8");
  const delimiter = file.original_filename.toLowerCase().endsWith(".tsv") ? "\t" : ",";
  const rows = text
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(delimiter));
  return rowsToRecords(file.original_filename, "Sheet1", rows);
}

function rowsToRecords(
  fileName: string,
  sheetName: string,
  rows: Array<Array<string | number | boolean | Date | null>>,
): UploadedRecord[] {
  const headerIndex = findHeaderIndex(rows);
  const headers = (rows[headerIndex] ?? []).map((header) => String(header ?? "").trim());

  return rows.slice(headerIndex + 1).map((row) => {
    const values: UploadedRecord["values"] = {};
    headers.forEach((header, index) => {
      if (header) values[header] = row[index] ?? null;
    });
    return { fileName, sheetName, values };
  });
}

function findHeaderIndex(rows: Array<Array<string | number | boolean | Date | null>>) {
  let bestIndex = 0;
  let bestScore = 0;

  rows.slice(0, 8).forEach((row, index) => {
    const nonEmpty = row.filter((cell) => String(cell ?? "").trim()).length;
    const textCells = row.filter((cell) => /[a-zA-Z_]/.test(String(cell ?? ""))).length;
    const score = nonEmpty + textCells * 2;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestIndex;
}

function createSemanticProfile(records: UploadedRecord[]): SemanticProfile {
  const profile: SemanticProfile = {
    totalSensitized: 0,
    sessions: 0,
    newHtaCases: 0,
    returningHtaCases: 0,
    avcCases: 0,
    postAvcCases: 0,
    validCards: 0,
    receivedCards: 0,
    totalPatients: 0,
    sensitizedWomen: 0,
    sensitizedMen: 0,
    patientWomen: 0,
    patientMen: 0,
    referrals: 0,
    activityByMonth: new globalThis.Map<string, number>(),
    activityBySite: new globalThis.Map<string, number>(),
    htaBySite: new globalThis.Map<string, number>(),
    records: records.length,
  };

  for (const record of records) {
    const totalSensitized =
      getNumber(record, ["TOTAL_SENSIBILISE", "form.participant.total_participants"]) ||
      0;
    const totalPatients = getNumber(record, ["TOTAL_PATIENT"]) || 0;
    const newHta = getNumber(record, ["NOUVEL_HTA"]) || 0;
    const returningHta = getNumber(record, ["ANCIEN_HTA"]) || 0;
    const avc = getNumber(record, ["AVC"]) || 0;
    const postAvc = getNumber(record, ["POST_AVC"]) || 0;
    const sessions = getNumber(record, ["SESSION"]) || (totalSensitized > 0 ? 1 : 0);
    const activityValue = totalSensitized || totalPatients || newHta + returningHta || 1;
    const month = getPeriod(record);
    const site = getString(record, [
      "SITE",
      "form.identification.site",
      "form.identifiant1.district",
      "District",
      "CENTRE",
      "Commune",
    ]);

    profile.totalSensitized += totalSensitized;
    profile.sessions += sessions;
    profile.newHtaCases += newHta;
    profile.returningHtaCases += returningHta;
    profile.avcCases += avc;
    profile.postAvcCases += postAvc;
    profile.validCards += getNumber(record, ["CARTE_VALIDE"]) || 0;
    profile.receivedCards += getNumber(record, ["TOTAL_CARTE_RECU"]) || 0;
    profile.totalPatients += totalPatients;
    if (totalSensitized > 0) {
      profile.sensitizedWomen +=
        getNumber(record, ["FEMME", "form.participant.women_count"]) || 0;
      profile.sensitizedMen +=
        getNumber(record, ["HOMME", "form.participant.men_count"]) || 0;
    }
    if (totalPatients > 0) {
      profile.patientWomen += getNumber(record, ["NB_FEMME"]) || 0;
      profile.patientMen += getNumber(record, ["NB_HOMME"]) || 0;
    }
    profile.referrals +=
      getNumber(record, [
        "form.question_commune_et_personnes_referees_aux_centre_de_sante.referrals_made",
      ]) || 0;

    addToMap(profile.activityByMonth, month, activityValue);
    addToMap(profile.activityBySite, site, activityValue);
    addToMap(profile.htaBySite, site, newHta + returningHta);
  }

  return profile;
}

function buildSemanticKpis(
  profile: SemanticProfile,
  fallback: {
    sourceFiles: number;
    rowCount: number;
    sheetCount: number;
    missingCells: number;
    reviewIssueCount: number;
  },
): DashboardPlan["kpis"] {
  const kpis: DashboardPlan["kpis"] = [];

  if (profile.totalSensitized > 0) {
    kpis.push({
      id: "people-sensitized",
      tone: "emerald",
      icon: "users",
      title: { fr: "Personnes sensibilisees", en: "People sensitized" },
      value: formatNumber(profile.totalSensitized),
      helper: { fr: `${formatNumber(profile.sessions)} session(s)`, en: `${formatNumber(profile.sessions)} session(s)` },
    });
  }
  if (profile.newHtaCases > 0) {
    kpis.push({
      id: "new-hta",
      tone: "cyan",
      icon: "heart",
      title: { fr: "Nouveaux cas HTA", en: "New HTA cases" },
      value: formatNumber(profile.newHtaCases),
      helper: { fr: "depistage communautaire", en: "community screening" },
    });
  }
  if (profile.totalPatients > 0) {
    kpis.push({
      id: "consultation-patients",
      tone: "violet",
      icon: "activity",
      title: { fr: "Patients en consultation", en: "Consultation patients" },
      value: formatNumber(profile.totalPatients),
      helper: { fr: `${formatNumber(profile.patientWomen)} femmes / ${formatNumber(profile.patientMen)} hommes`, en: `${formatNumber(profile.patientWomen)} women / ${formatNumber(profile.patientMen)} men` },
    });
  }
  if (profile.validCards > 0 || profile.receivedCards > 0) {
    kpis.push({
      id: "valid-cards",
      tone: "amber",
      icon: "shield",
      title: { fr: "Cartes valides", en: "Valid cards" },
      value: formatNumber(profile.validCards),
      helper: { fr: `${formatNumber(profile.receivedCards)} cartes recues`, en: `${formatNumber(profile.receivedCards)} cards received` },
    });
  }
  if (profile.avcCases + profile.postAvcCases > 0) {
    kpis.push({
      id: "avc-followup",
      tone: "rose",
      icon: "alert",
      title: { fr: "Cas AVC suivis", en: "Stroke cases tracked" },
      value: formatNumber(profile.avcCases + profile.postAvcCases),
      helper: { fr: `${formatNumber(profile.postAvcCases)} post-AVC`, en: `${formatNumber(profile.postAvcCases)} post-stroke` },
    });
  }

  if (kpis.length < 4) {
    kpis.push(
      {
        id: "uploaded-rows",
        tone: "emerald",
        icon: "activity",
        title: { fr: "Enregistrements lus", en: "Records read" },
        value: formatNumber(fallback.rowCount || profile.records),
        helper: { fr: `${fallback.sheetCount} feuille(s)`, en: `${fallback.sheetCount} sheet(s)` },
      },
      {
        id: "uploaded-issues",
        tone: fallback.reviewIssueCount > 0 ? "amber" : "emerald",
        icon: "alert",
        title: { fr: "Points a verifier", en: "Issues to review" },
        value: formatNumber(fallback.reviewIssueCount),
        helper: { fr: "validation automatique", en: "automatic validation" },
      },
    );
  }

  return kpis.slice(0, 4);
}

function buildSemanticSections(profile: SemanticProfile): Section[] {
  const sections: Section[] = [];
  const monthly = mapToChartData(profile.activityByMonth, 12, "asc");
  const siteActivity = mapToChartData(profile.activityBySite, 8, "desc");
  const htaBySite = mapToChartData(profile.htaBySite, 8, "desc").filter((point) => point.value > 0);

  if (monthly.length > 0) {
    sections.push({
      id: "activity-trend",
      tone: "emerald",
      type: "line",
      title: { fr: "Tendance activite", en: "Activity trend" },
      insight: {
        fr: "Suit les volumes mensuels des sensibilisations, consultations et depistages.",
        en: "Tracks monthly volume across sensitization, consultations, and screening.",
      },
      data: monthly,
    });
  }
  if (siteActivity.length > 0) {
    sections.push({
      id: "site-comparison",
      tone: "cyan",
      type: "bar",
      title: { fr: "Activite par site", en: "Activity by site" },
      insight: {
        fr: "Met en evidence les sites ou l'activite communautaire est la plus forte.",
        en: "Highlights where community activity is strongest.",
      },
      data: siteActivity,
    });
  }
  if (htaBySite.length > 0) {
    sections.push({
      id: "hta-by-site",
      tone: "amber",
      type: "bar",
      title: { fr: "Cas HTA par site", en: "HTA cases by site" },
      insight: {
        fr: "Compare les nouveaux et anciens cas HTA par zone de suivi.",
        en: "Compares new and returning HTA cases by follow-up area.",
      },
      data: htaBySite,
    });
  }

  return sections;
}

function getMissingByColumn(artifacts: ExtractionArtifact[]) {
  const columns = new globalThis.Map<string, number>();

  for (const artifact of artifacts) {
    for (const sheet of artifact.sheets ?? []) {
      for (const column of sheet.missingByColumn ?? []) {
        const name = column.column?.trim();
        if (!name) continue;
        columns.set(name, (columns.get(name) ?? 0) + numberOrZero(column.missingCount));
      }
    }
  }

  return Array.from(columns.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: shortenLabel(label), value }));
}

function getReviewIssueTopics(artifacts: ExtractionArtifact[]) {
  const topics = new globalThis.Map<string, number>();

  for (const artifact of artifacts) {
    for (const issue of artifact.reviewIssues ?? []) {
      const topic = humanizeIssueTopic(issue.issueType || issue.column || "validation");
      topics.set(topic, (topics.get(topic) ?? 0) + 1);
    }
  }

  return Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: shortenLabel(label), value }));
}

function humanizeIssueTopic(value: string) {
  const labelsByType: Record<string, string> = {
    missing_value: "Valeurs manquantes",
    mostly_empty_column: "Champs souvent vides",
    numeric_outlier: "Valeurs numeriques atypiques",
    numeric_range: "Valeurs hors plage",
    numeric_parse: "Formats numeriques",
    date_parse: "Formats de date",
    date_sequence: "Chronologie a verifier",
    duplicate_identifier: "Identifiants dupliques",
    text_quality: "Texte a nettoyer",
    rare_category: "Categories rares",
  };

  return (
    labelsByType[value] ??
    value
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function getNumber(record: UploadedRecord, columnNames: string[]) {
  for (const columnName of columnNames) {
    const value = getValue(record, columnName);
    const numberValue =
      typeof value === "number"
        ? value
        : Number(String(value ?? "").replace(/\s/g, "").replace(",", "."));
    if (Number.isFinite(numberValue)) return numberValue;
  }

  return null;
}

function getString(record: UploadedRecord, columnNames: string[]) {
  for (const columnName of columnNames) {
    const value = getValue(record, columnName);
    const text = String(value ?? "").trim();
    if (text && text !== "---") return normalizeDisplayLabel(text);
  }

  return "";
}

function getPeriod(record: UploadedRecord) {
  const directPeriod = getString(record, ["PERIODE", "MOIS"]);
  if (/^\d{4}-\d{2}$/.test(directPeriod)) return directPeriod;

  const year = getString(record, ["Annee", "form.identification.Annee", "ANNUEL"]);
  const month = getString(record, ["Mois", "form.identification.mois_enquete"]);
  if (/^\d{4}$/.test(year) && /^\d{1,2}$/.test(month)) {
    return `${year}-${month.padStart(2, "0")}`;
  }

  const dateText = getString(record, [
    "form.question15.date_activity",
    "date",
    "Date_validation",
    "completed_time",
  ]);
  const datePeriod = parsePeriodFromDate(dateText);
  if (datePeriod) return datePeriod;

  if (/^\d{1,2}$/.test(directPeriod)) return directPeriod.padStart(2, "0");

  return directPeriod;
}

function parsePeriodFromDate(value: string) {
  if (!value) return "";

  const isoMatch = value.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

  const shortDateMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (shortDateMatch) {
    const year =
      shortDateMatch[3].length === 2
        ? `20${shortDateMatch[3]}`
        : shortDateMatch[3];
    return `${year}-${shortDateMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function getValue(record: UploadedRecord, columnName: string) {
  const normalizedColumnName = normalizeColumnName(columnName);
  const matchingKey = Object.keys(record.values).find(
    (key) => normalizeColumnName(key) === normalizedColumnName,
  );

  return matchingKey ? record.values[matchingKey] : null;
}

function normalizeColumnName(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function addToMap(map: Map<string, number>, rawKey: string, value: number) {
  if (!rawKey || !Number.isFinite(value) || value <= 0) return;
  map.set(rawKey, (map.get(rawKey) ?? 0) + value);
}

function mapToChartData(
  map: Map<string, number>,
  limit: number,
  direction: "asc" | "desc",
) {
  return Array.from(map.entries())
    .sort((a, b) => {
      if (direction === "asc") return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    })
    .slice(0, limit)
    .map(([label, value]) => ({ label: shortenLabel(label), value: Math.round(value) }));
}

function normalizeDisplayLabel(value: string) {
  if (/^\d{4}-\d{2}$/.test(value)) return value;
  if (/^\d{1,2}$/.test(value)) return value.padStart(2, "0");

  return value
    .replace(/\|/g, " / ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

function isInternalArtifact(file: ProjectFileRow) {
  return file.storage_path.includes("/artifacts/");
}

function dedupeProjectFiles(files: ProjectFileRow[]) {
  const seen = new Set<string>();
  const deduped: ProjectFileRow[] = [];

  for (const file of files) {
    const key = normalizeFileIdentity(file.original_filename);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(file);
  }

  return deduped;
}

function normalizeFileIdentity(filename: string) {
  return filename
    .toLowerCase()
    .replace(/\.extraction\.json$/, "")
    .replace(/\.summary\.md$/, "")
    .replace(/\.missing-data\.md$/, "")
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function shortenLabel(value: string) {
  return value.length > 32 ? `${value.slice(0, 29)}...` : value;
}
