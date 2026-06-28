import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import {
  createSupabaseServerClient,
  getSupabaseServerConfig,
} from "@/lib/supabase/server";
import { projects } from "@/lib/projects";

export const runtime = "nodejs";

type UploadStageStatus = "done" | "active" | "waiting" | "error";

type WorkflowStage = {
  key:
    | "received"
    | "folder"
    | "convert"
    | "extract"
    | "quality"
    | "approval";
  status: UploadStageStatus;
  message?: string | null;
};

type ProjectTarget = {
  id: string;
  name: string;
  folder: string;
  source: "existing" | "auto";
};

type UploadedFileRecord = {
  id: string;
  name: string;
  sizeBytes: number;
  kind: string;
  storagePath: string;
  mimeType: string;
  buffer: Buffer;
};

type ParsedSheet = {
  name: string;
  headers: string[];
  rowCount: number;
  columnCount: number;
  missingByColumn: Array<{
    column: string;
    missingCount: number;
    missingPercent: number;
  }>;
  missingCells: Array<{
    column: string;
    rowNumber: number;
    value: string;
  }>;
  rows: string[][];
  previewRows: string[][];
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

type FileAnalysis = {
  markdown: string;
  extractionJson: string;
  missingReport: string;
  sheetCount: number;
  rowCount: number;
  columnCount: number;
  missingCells: number;
  missingColumns: number;
  reviewIssues: ReviewIssue[];
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  { key: "received", status: "done" },
  { key: "folder", status: "done" },
  { key: "convert", status: "waiting" },
  { key: "extract", status: "waiting" },
  { key: "quality", status: "waiting" },
  { key: "approval", status: "waiting" },
];

export async function POST(request: Request) {
  let config;

  try {
    config = getSupabaseServerConfig();
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Supabase is not configured." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const projectId = String(formData.get("projectId") ?? "auto");
  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "Upload at least one file before starting the workflow." },
      { status: 400 },
    );
  }

  const supabase = createSupabaseServerClient();
  const batchId = randomUUID();
  let targetProject: ProjectTarget;

  try {
    targetProject = await resolveProjectTarget(supabase, projectId, files);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Select an existing project before uploading.",
      },
      { status: 400 },
    );
  }

  const projectResult = await supabase.from("projects").upsert(
    {
      id: targetProject.id,
      name: targetProject.name,
      slug: targetProject.id,
      folder_path: targetProject.folder,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (projectResult.error) {
    return NextResponse.json(
      { error: projectResult.error.message },
      { status: 500 },
    );
  }

  const batchResult = await supabase
    .from("upload_batches")
    .insert({
      id: batchId,
      project_id: targetProject.id,
      status: "received",
      source: "web-upload",
      file_count: files.length,
    });

  if (batchResult.error) {
    return NextResponse.json({ error: batchResult.error.message }, { status: 500 });
  }

  const uploadedFiles = [];
  const uploadedFileRecords: UploadedFileRecord[] = [];

  for (const file of files) {
    const safeName = sanitizeFileName(file.name);
    const storagePath = `${targetProject.id}/${batchId}/${safeName}`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageResult = await supabase.storage
      .from(config.uploadBucket)
      .upload(storagePath, fileBuffer, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (storageResult.error) {
      await markBatchFailed(supabase, batchId, storageResult.error.message);

      return NextResponse.json(
        { error: storageResult.error.message },
        { status: 500 },
      );
    }

    const kind = detectFileKind(file.name, file.type);
    const fileId = randomUUID();
    const metadataResult = await supabase.from("project_files").insert({
      id: fileId,
      batch_id: batchId,
      project_id: targetProject.id,
      original_filename: file.name,
      storage_bucket: config.uploadBucket,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      kind,
      status: "uploaded",
    });

    if (metadataResult.error) {
      await markBatchFailed(supabase, batchId, metadataResult.error.message);

      return NextResponse.json(
        { error: metadataResult.error.message },
        { status: 500 },
      );
    }

    uploadedFiles.push({
      id: fileId,
      name: file.name,
      sizeBytes: file.size,
      kind,
      storagePath,
    });
    uploadedFileRecords.push({
      id: fileId,
      name: file.name,
      sizeBytes: file.size,
      kind,
      storagePath,
      mimeType: file.type || "application/octet-stream",
      buffer: fileBuffer,
    });
  }

  const stepRows = WORKFLOW_STAGES.map((stage, index) => ({
    batch_id: batchId,
    project_id: targetProject.id,
    step_key: stage.key,
    status: stage.status,
    sort_order: index + 1,
  }));
  const stepsResult = await supabase.from("upload_workflow_steps").insert(stepRows);

  if (stepsResult.error) {
    await markBatchFailed(supabase, batchId, stepsResult.error.message);

    return NextResponse.json({ error: stepsResult.error.message }, { status: 500 });
  }

  try {
    const workflowResult = await processUploadWorkflow({
      supabase,
      batchId,
      projectId: targetProject.id,
      bucket: config.uploadBucket,
      files: uploadedFileRecords,
    });

    return NextResponse.json({
      batchId,
      project: targetProject,
      files: uploadedFiles,
      stages: workflowResult.stages,
      reviewIssues: workflowResult.reviewIssues,
      summary: workflowResult.summary,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload workflow failed.";
    await markBatchFailed(supabase, batchId, message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function resolveProjectTarget(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  projectId: string,
  files: File[],
): Promise<ProjectTarget> {
  if (projectId !== "auto" && projectId !== "new") {
    const project = projects.find((candidate) => candidate.id === projectId);

    if (project) {
      return {
        id: project.id,
        name: project.name,
        folder: project.folder,
        source: "existing",
      };
    }

    const persistedProject = await supabase
      .from("projects")
      .select("id,name,folder_path,description")
      .eq("id", projectId)
      .maybeSingle();

    if (persistedProject.error) {
      throw new Error(persistedProject.error.message);
    }

    if (persistedProject.data?.description) {
      return {
        id: persistedProject.data.id,
        name: persistedProject.data.name,
        folder: persistedProject.data.folder_path,
        source: "existing",
      };
    }

    throw new Error("Select a saved project before uploading this file.");
  }

  if (projectId === "auto") {
    const persistedProjects = await supabase
      .from("projects")
      .select("id,name,folder_path,description")
      .not("description", "is", null);

    if (persistedProjects.error) {
      throw new Error(persistedProjects.error.message);
    }

    const availableProjects = mergeProjectTargets([
      ...projects.map((project) => ({
        id: project.id,
        name: project.name,
        folder: project.folder,
        source: "auto" as const,
      })),
      ...(persistedProjects.data ?? []).map((project) => ({
        id: project.id,
        name: project.name,
        folder: project.folder_path,
        source: "auto" as const,
      })),
    ]);
    const filenames = files.map((file) => file.name.toLowerCase()).join(" ");
    const inferredProject = availableProjects.find((project) => {
      const projectTokens = [project.id, project.name, project.folder]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);

      return projectTokens.some((token) => filenames.includes(token));
    });

    if (inferredProject) {
      return {
        id: inferredProject.id,
        name: inferredProject.name,
        folder: inferredProject.folder,
        source: "auto",
      };
    }

    throw new Error(
      "Could not auto-detect the project from this filename. Select or create a project first, then upload the file.",
    );
  }

  throw new Error("Create the project first, then upload the file into that project.");
}

function mergeProjectTargets(projectTargets: ProjectTarget[]) {
  const targetMap = new globalThis.Map<string, ProjectTarget>();

  for (const projectTarget of projectTargets) {
    if (!targetMap.has(projectTarget.id)) {
      targetMap.set(projectTarget.id, projectTarget);
    }
  }

  return Array.from(targetMap.values());
}

function detectFileKind(filename: string, mimeType: string) {
  const extension = filename.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") return "excel";
  if (extension === "csv" || extension === "tsv") return "csv";
  if (extension === "json") return "json";
  if (extension === "zip") return "archive";
  if (mimeType.includes("pdf")) return "pdf";

  return "unknown";
}

function sanitizeFileName(filename: string) {
  const [name, ...extensionParts] = filename.split(".");
  const extension = extensionParts.length > 0 ? `.${extensionParts.pop()}` : "";

  return `${slugify(name || "upload")}${extension.toLowerCase()}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function markBatchFailed(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  batchId: string,
  errorMessage: string,
) {
  await supabase
    .from("upload_batches")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", batchId);
}

async function processUploadWorkflow({
  supabase,
  batchId,
  projectId,
  bucket,
  files,
}: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  batchId: string;
  projectId: string;
  bucket: string;
  files: UploadedFileRecord[];
}) {
  await updateStep(supabase, batchId, "convert", "active", "Creating Markdown summaries.");

  const analyses = files.map((file) => ({
    file,
    analysis: analyzeFile(file),
  }));

  const artifacts = [];
  for (const item of analyses) {
    const basePath = `${projectId}/${batchId}/artifacts/${sanitizeFileName(
      item.file.name.replace(/\.[^.]+$/, ""),
    )}`;
    artifacts.push(
      await uploadArtifact({
        supabase,
        batchId,
        projectId,
        bucket,
        storagePath: `${basePath}.summary.md`,
        filename: `${item.file.name}.summary.md`,
        contentType: "text/markdown; charset=utf-8",
        body: item.analysis.markdown,
        kind: "markdown",
        status: "converted",
      }),
    );
  }

  await updateStep(
    supabase,
    batchId,
    "convert",
    "done",
    `${analyses.length} Markdown summary file(s) generated.`,
  );
  await updateStep(supabase, batchId, "extract", "active", "Reading sheets and extracting schema.");

  for (const item of analyses) {
    const basePath = `${projectId}/${batchId}/artifacts/${sanitizeFileName(
      item.file.name.replace(/\.[^.]+$/, ""),
    )}`;
    artifacts.push(
      await uploadArtifact({
        supabase,
        batchId,
        projectId,
        bucket,
        storagePath: `${basePath}.extraction.json`,
        filename: `${item.file.name}.extraction.json`,
        contentType: "application/json; charset=utf-8",
        body: item.analysis.extractionJson,
        kind: "json",
        status: "extracted",
      }),
    );
  }

  const totalRows = analyses.reduce((sum, item) => sum + item.analysis.rowCount, 0);
  const totalSheets = analyses.reduce((sum, item) => sum + item.analysis.sheetCount, 0);
  await updateStep(
    supabase,
    batchId,
    "extract",
    "done",
    `${totalRows} row(s) extracted across ${totalSheets} sheet/table(s).`,
  );
  await updateStep(supabase, batchId, "quality", "active", "Running validation checks.");

  for (const item of analyses) {
    const basePath = `${projectId}/${batchId}/artifacts/${sanitizeFileName(
      item.file.name.replace(/\.[^.]+$/, ""),
    )}`;
    artifacts.push(
      await uploadArtifact({
        supabase,
        batchId,
        projectId,
        bucket,
        storagePath: `${basePath}.missing-data.md`,
        filename: `${item.file.name}.missing-data.md`,
        contentType: "text/markdown; charset=utf-8",
        body: item.analysis.missingReport,
        kind: "markdown",
        status: "missing-data-reported",
      }),
    );
  }

  const missingCells = analyses.reduce((sum, item) => sum + item.analysis.missingCells, 0);
  const missingColumns = analyses.reduce(
    (sum, item) => sum + item.analysis.missingColumns,
    0,
  );
  const reviewIssues = analyses.flatMap((item) => item.analysis.reviewIssues);
  await updateStep(
    supabase,
    batchId,
    "quality",
    "done",
    `${reviewIssues.length} validation issue(s) found, including ${missingCells} missing cell(s) in ${missingColumns} column(s).`,
  );
  await updateStep(
    supabase,
    batchId,
    "approval",
    "active",
    "Review flagged data points before final import.",
    "awaiting_approval",
  );

  await supabase
    .from("project_files")
    .update({ status: "awaiting_approval", updated_at: new Date().toISOString() })
    .eq("batch_id", batchId)
    .eq("status", "uploaded");

  const stages: WorkflowStage[] = [
    { key: "received", status: "done", message: "Source file uploaded to private storage." },
    { key: "folder", status: "done", message: "Project folder selected or created." },
    { key: "convert", status: "done", message: `${analyses.length} Markdown summary file(s) generated.` },
    { key: "extract", status: "done", message: `${totalRows} row(s) extracted across ${totalSheets} sheet/table(s).` },
    { key: "quality", status: "done", message: `${reviewIssues.length} validation issue(s) found, including ${missingCells} missing cell(s) in ${missingColumns} column(s).` },
    { key: "approval", status: "active", message: "Review flagged data points before final import." },
  ];

  return {
    artifacts,
    reviewIssues,
    stages,
    summary: {
      rowCount: totalRows,
      sheetCount: totalSheets,
      missingCells,
      missingColumns,
      reviewIssueCount: reviewIssues.length,
      status: "awaiting_approval",
    },
  };
}

async function updateStep(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  batchId: string,
  stepKey: WorkflowStage["key"],
  status: UploadStageStatus,
  message: string,
  batchStatus?: string,
) {
  const stepResult = await supabase
    .from("upload_workflow_steps")
    .update({
      status,
      message,
      updated_at: new Date().toISOString(),
    })
    .eq("batch_id", batchId)
    .eq("step_key", stepKey);

  if (stepResult.error) throw new Error(stepResult.error.message);

  if (batchStatus) {
    const batchResult = await supabase
      .from("upload_batches")
      .update({
        status: batchStatus,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (batchResult.error) throw new Error(batchResult.error.message);
  }
}

async function uploadArtifact({
  supabase,
  batchId,
  projectId,
  bucket,
  storagePath,
  filename,
  contentType,
  body,
  kind,
  status,
}: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  batchId: string;
  projectId: string;
  bucket: string;
  storagePath: string;
  filename: string;
  contentType: string;
  body: string;
  kind: string;
  status: string;
}) {
  const buffer = Buffer.from(body, "utf8");
  const uploadResult = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (uploadResult.error) throw new Error(uploadResult.error.message);

  const fileId = randomUUID();
  const metadataResult = await supabase.from("project_files").insert({
    id: fileId,
    batch_id: batchId,
    project_id: projectId,
    original_filename: filename,
    storage_bucket: bucket,
    storage_path: storagePath,
    mime_type: contentType,
    size_bytes: buffer.byteLength,
    kind,
    status,
  });

  if (metadataResult.error) throw new Error(metadataResult.error.message);

  return {
    id: fileId,
    name: filename,
    sizeBytes: buffer.byteLength,
    kind,
    storagePath,
  };
}

function analyzeFile(file: UploadedFileRecord): FileAnalysis {
  const sheets = parseFile(file);
  const rowCount = sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0);
  const columnCount = sheets.reduce((max, sheet) => Math.max(max, sheet.columnCount), 0);
  const missingCells = sheets.reduce(
    (sum, sheet) =>
      sum + sheet.missingByColumn.reduce((columnSum, column) => columnSum + column.missingCount, 0),
    0,
  );
  const missingColumns = sheets.reduce(
    (sum, sheet) =>
      sum + sheet.missingByColumn.filter((column) => column.missingCount > 0).length,
    0,
  );
  const extraction = {
    originalFilename: file.name,
    detectedKind: file.kind,
    sizeBytes: file.sizeBytes,
    sheetCount: sheets.length,
    rowCount,
    columnCount,
    missingCells,
    missingColumns,
    sheets: sheets.map((sheet) => ({
      name: sheet.name,
      rowCount: sheet.rowCount,
      columnCount: sheet.columnCount,
      headers: sheet.headers,
      missingByColumn: sheet.missingByColumn,
      missingCells: sheet.missingCells,
    })),
  };
  const reviewIssues = runReviewAgent(buildReviewIssues(file, sheets), sheets);

  return {
    markdown: renderMarkdownSummary(file, sheets, missingCells),
    extractionJson: JSON.stringify({ ...extraction, reviewIssues }, null, 2),
    missingReport: renderMissingDataReport(file, sheets, missingCells),
    sheetCount: sheets.length,
    rowCount,
    columnCount,
    missingCells,
    missingColumns,
    reviewIssues,
  };
}

function parseFile(file: UploadedFileRecord): ParsedSheet[] {
  if (file.kind === "excel") {
    const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
    return workbook.SheetNames.map((sheetName) => {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Array<string | number | boolean | Date | null>>(
        worksheet,
        { header: 1, raw: false, defval: null },
      );
      return profileRows(sheetName, rows);
    });
  }

  if (file.kind === "csv") {
    const delimiter = file.name.toLowerCase().endsWith(".tsv") ? "\t" : ",";
    return [profileRows(file.name, parseDelimited(file.buffer.toString("utf8"), delimiter))];
  }

  if (file.kind === "json") {
    return [profileRows(file.name, parseJsonRows(file.buffer.toString("utf8")))];
  }

  return [
    {
      name: file.name,
      headers: ["file"],
      rowCount: 1,
      columnCount: 1,
      missingByColumn: [],
      missingCells: [],
      rows: [[file.name]],
      previewRows: [[file.name]],
    },
  ];
}

function profileRows(
  sheetName: string,
  rawRows: Array<Array<string | number | boolean | Date | null>>,
): ParsedSheet {
  const normalizedRows = rawRows
    .map((row) => row.map((cell) => normalizeCell(cell)))
    .filter((row) => row.some((cell) => cell !== ""));
  const headerIndex = normalizedRows.findIndex((row) => row.some((cell) => cell !== ""));
  const headerRow = headerIndex >= 0 ? normalizedRows[headerIndex] : [];
  const dataRows = headerIndex >= 0 ? normalizedRows.slice(headerIndex + 1) : [];
  const width = Math.max(headerRow.length, ...dataRows.map((row) => row.length), 0);
  const headers = Array.from({ length: width }, (_, index) => {
    const header = headerRow[index]?.trim();
    return header || `Column ${index + 1}`;
  });
  const completeRows = dataRows.map((row) =>
    Array.from({ length: width }, (_, index) => row[index] ?? ""),
  );
  const missingByColumn = headers.map((column, columnIndex) => {
    const missingCount = completeRows.filter(
      (row) => isMissingValue(row[columnIndex]),
    ).length;
    return {
      column,
      missingCount,
      missingPercent:
        completeRows.length === 0
          ? 0
        : Math.round((missingCount / completeRows.length) * 1000) / 10,
    };
  });
  const missingCells = completeRows.flatMap((row, rowIndex) =>
    headers.flatMap((column, columnIndex) =>
      isMissingValue(row[columnIndex])
        ? [
            {
              column,
              rowNumber: headerIndex + rowIndex + 2,
              value: row[columnIndex] ?? "",
            },
          ]
        : [],
    ),
  );

  return {
    name: sheetName,
    headers,
    rowCount: completeRows.length,
    columnCount: width,
    missingByColumn,
    missingCells,
    rows: completeRows,
    previewRows: completeRows.slice(0, 8),
  };
}

function buildReviewIssues(file: UploadedFileRecord, sheets: ParsedSheet[]) {
  return sheets
    .flatMap((sheet) =>
      [
        ...buildMissingValueIssues(file, sheet),
        ...buildNumericIssues(file, sheet),
        ...buildDateIssues(file, sheet),
        ...buildDuplicateIssues(file, sheet),
        ...buildTextQualityIssues(file, sheet),
        ...buildUnexpectedCategoryIssues(file, sheet),
      ],
    )
    .slice(0, 100);
}

function buildMissingValueIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];
  const missingColumns = sheet.missingByColumn.filter(
    (column) => column.missingCount > 0,
  );

  for (const column of missingColumns) {
    if (column.missingPercent === 100) {
      continue;
    }

    if (column.missingPercent >= 80) {
      const firstMissingCell = sheet.missingCells.find(
        (cell) => cell.column === column.column,
      );

      issues.push(
        createReviewIssue({
          file,
          sheet,
          column: column.column,
          rowNumber: firstMissingCell?.rowNumber ?? 2,
          currentValue: "",
          issueType: "mostly_empty_column",
          severity: "low",
          message: `${column.column} is mostly empty (${column.missingPercent}% missing).`,
          suggestedReviewStep:
            "Treat this as a collection-pattern note unless the field is required for this import.",
          suggestedValue: "Accepter comme champ optionnel",
        }),
      );
    }
  }

  const suppressedColumns = new Set(
    missingColumns
      .filter((column) => column.missingPercent >= 80)
      .map((column) => column.column),
  );

  issues.push(...sheet.missingCells.filter((cell) => !suppressedColumns.has(cell.column)).map((cell, index) => {
    const columnProfile = sheet.missingByColumn.find(
      (column) => column.column === cell.column,
    );
    const missingPercent = columnProfile?.missingPercent ?? 0;
    const severity: ReviewIssue["severity"] =
      missingPercent >= 40 ? "high" : missingPercent >= 10 ? "medium" : "low";

    return createReviewIssue({
      file,
      sheet,
      column: cell.column,
      rowNumber: cell.rowNumber,
      currentValue: cell.value,
      issueType: "missing_value",
      severity,
      message: `Missing value in ${cell.column} on row ${cell.rowNumber}.`,
      suggestedReviewStep: "Enter the missing value or accept it as intentionally blank.",
      index,
    });
  }));

  return issues;
}

function buildNumericIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];

  sheet.headers.forEach((column, columnIndex) => {
    const values = sheet.rows.map((row) => row[columnIndex] ?? "");
    const nonMissing = values.filter((value) => !isMissingValue(value));
    if (nonMissing.length === 0) return;

    const parsed = nonMissing.map(parseNumber);
    const numericRatio =
      parsed.filter((value) => value !== null).length / nonMissing.length;

    if (numericRatio >= 0.2 && numericRatio < 0.8) {
      const badRowIndex = values.findIndex(
        (value) => !isMissingValue(value) && parseNumber(value) === null,
      );
      if (badRowIndex >= 0) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: badRowIndex + 2,
            currentValue: values[badRowIndex] ?? "",
            issueType: "mixed_datatypes",
            severity: "medium",
            message: `${column} mixes numeric and non-numeric values.`,
            suggestedReviewStep:
              "Confirm the expected field type and correct non-conforming entries.",
          }),
        );
      }
    }

    const rule = NUMERIC_RULES.find(([token]) =>
      numericRuleMatches(column, token),
    );
    if (!rule) return;

    const [token, minValue, maxValue, issueType] = rule;
    values.forEach((value, rowIndex) => {
      if (isMissingValue(value)) return;

      const numericValue = parseNumber(value);
      if (numericValue === null) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType: "numeric_parse_failed",
            severity: "medium",
            message: `Expected a numeric value because ${column} matches '${token}'.`,
            suggestedReviewStep:
              "Correct the value or confirm this field should not be treated as numeric.",
          }),
        );
        return;
      }

      if (numericValue < minValue || numericValue > maxValue) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType,
            severity: "high",
            message: `${column} is outside the expected range [${minValue}, ${maxValue}].`,
            suggestedReviewStep:
              "Validate the source value and units before using this record.",
          }),
        );
      }
    });

    if (numericRatio >= 0.8 && nonMissing.length >= 8) {
      const numericValues = values.map(parseNumber);
      const present = numericValues.filter((value): value is number => value !== null);
      const q1 = quantile(present, 0.25);
      const q3 = quantile(present, 0.75);
      const iqr = q3 - q1;

      if (iqr > 0) {
        numericValues.forEach((value, rowIndex) => {
          if (value === null) return;
          if (value < q1 - 3 * iqr || value > q3 + 3 * iqr) {
            issues.push(
              createReviewIssue({
                file,
                sheet,
                column,
                rowNumber: rowIndex + 2,
                currentValue: values[rowIndex] ?? "",
                issueType: "numeric_outlier",
                severity: "low",
                message: `${column} is a statistical outlier for this column.`,
                suggestedReviewStep:
                  "Review the value for unit mix-ups, misplaced decimals, or reporting errors.",
              }),
            );
          }
        });
      }
    }
  });

  return issues;
}

function buildDateIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];
  const dateColumns = sheet.headers
    .map((column, index) => ({ column, index }))
    .filter(({ column, index }) =>
      isDateLikeColumn(column, sheet.rows.map((row) => row[index] ?? "")),
    );
  const parsedByColumn = new Map<string, Array<Date | null>>();

  dateColumns.forEach(({ column, index }) => {
    const values = sheet.rows.map((row) => row[index] ?? "");
    const parsed = values.map(parseDateValue);
    parsedByColumn.set(column, parsed);

    const formats = new Set(
      values
        .filter((value) => !isMissingValue(value))
        .map(dateFormatHint)
        .filter(Boolean),
    );

    if (formats.size > 1) {
      const rowIndex = values.findIndex((value) => !isMissingValue(value));
      issues.push(
        createReviewIssue({
          file,
          sheet,
          column,
          rowNumber: Math.max(rowIndex + 2, 2),
          currentValue: rowIndex >= 0 ? values[rowIndex] ?? "" : "",
          issueType: "inconsistent_date_formats",
          severity: "low",
          message: `${column} appears to mix date formats: ${Array.from(formats)
            .sort()
            .join(", ")}.`,
          suggestedReviewStep:
            "Standardize the date entry or export format for this field.",
        }),
      );
    }

    values.forEach((value, rowIndex) => {
      if (isMissingValue(value)) return;

      const parsedValue = parsed[rowIndex];
      if (!parsedValue) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType: "invalid_date",
            severity: "medium",
            message: `${column} could not be parsed as a date.`,
            suggestedReviewStep:
              "Correct the date format in the source export before analysis.",
          }),
        );
        return;
      }

      const now = Date.now();
      const futureLimit = now + 24 * 60 * 60 * 1000;
      if (parsedValue.getUTCFullYear() <= 1901 || parsedValue.getTime() > futureLimit) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType: "implausible_date",
            severity: "high",
            message: `${column} is a placeholder, very old, or in the future.`,
            suggestedReviewStep:
              "Check whether the value is a default date or an entry error.",
          }),
        );
      }
    });
  });

  for (const [earlier, later] of comparableDatePairs(
    dateColumns.map(({ column }) => column),
  )) {
    const earlierDates = parsedByColumn.get(earlier);
    const laterDates = parsedByColumn.get(later);
    if (!earlierDates || !laterDates) continue;

    laterDates.forEach((laterDate, rowIndex) => {
      const earlierDate = earlierDates[rowIndex];
      if (!earlierDate || !laterDate || laterDate >= earlierDate) return;

      issues.push(
        createReviewIssue({
          file,
          sheet,
          column: later,
          rowNumber: rowIndex + 2,
          currentValue:
            sheet.rows[rowIndex]?.[sheet.headers.indexOf(later)] ?? "",
          issueType: "date_sequence_conflict",
          severity: "medium",
          message: `${later} occurs before ${earlier}.`,
          suggestedReviewStep:
            "Review the source dates and confirm the chronology.",
        }),
      );
    });
  }

  issues.push(...buildAgeConflictIssues(file, sheet, dateColumns, parsedByColumn));
  return issues;
}

function buildAgeConflictIssues(
  file: UploadedFileRecord,
  sheet: ParsedSheet,
  dateColumns: Array<{ column: string; index: number }>,
  parsedByColumn: Map<string, Array<Date | null>>,
) {
  const issues: ReviewIssue[] = [];
  const dobColumns = dateColumns.filter(({ column }) => {
    const normalized = normalizeColumn(column);
    return normalized.includes("date_de_naissance") || normalized.includes("birth");
  });
  const ageColumns = sheet.headers
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => numericRuleMatches(column, "age"));
  const eventColumns = dateColumns.filter(
    ({ column }) => !dobColumns.some((dobColumn) => dobColumn.column === column),
  );

  for (const dobColumn of dobColumns) {
    const dobDates = parsedByColumn.get(dobColumn.column);
    if (!dobDates) continue;

    for (const ageColumn of ageColumns) {
      for (const eventColumn of eventColumns.slice(0, 3)) {
        const eventDates = parsedByColumn.get(eventColumn.column);
        if (!eventDates) continue;

        sheet.rows.forEach((row, rowIndex) => {
          const dob = dobDates[rowIndex];
          const eventDate = eventDates[rowIndex];
          const reportedAge = parseNumber(row[ageColumn.index] ?? "");

          if (!dob || !eventDate || reportedAge === null) return;

          const calculatedAge = Math.floor(
            (eventDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
          );
          if (
            calculatedAge >= 0 &&
            calculatedAge <= 120 &&
            Math.abs(calculatedAge - reportedAge) > 2
          ) {
            issues.push(
              createReviewIssue({
                file,
                sheet,
                column: ageColumn.column,
                rowNumber: rowIndex + 2,
                currentValue: row[ageColumn.index] ?? "",
                issueType: "plausible_but_conflicting_age",
                severity: "medium",
                message: `Reported age differs from birth-date-derived age (${calculatedAge}) by more than 2 years.`,
                suggestedReviewStep:
                  "Confirm the birth date, event date, and reported age before import.",
              }),
            );
          }
        });
        break;
      }
    }
  }

  return issues;
}

function buildDuplicateIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];
  const rowKeys = new Map<string, number[]>();

  sheet.rows.forEach((row, index) => {
    const key = row.map((value) => value.trim().toLowerCase()).join("\u001f");
    if (!key.trim()) return;
    rowKeys.set(key, [...(rowKeys.get(key) ?? []), index]);
  });

  for (const indexes of rowKeys.values()) {
    if (indexes.length <= 1) continue;
    for (const rowIndex of indexes.slice(0, 10)) {
      issues.push(
        createReviewIssue({
          file,
          sheet,
          column: "",
          rowNumber: rowIndex + 2,
          currentValue: "",
          issueType: "duplicate_rows",
          severity: "medium",
          message: `${indexes.length} rows appear to be exact duplicates.`,
          suggestedReviewStep:
            "Compare duplicated source records before deciding whether they are valid repeated events.",
        }),
      );
    }
    break;
  }

  sheet.headers.forEach((column, columnIndex) => {
    if (!isIdentifierColumn(column)) return;

    const seen = new Map<string, number[]>();
    sheet.rows.forEach((row, rowIndex) => {
      const value = (row[columnIndex] ?? "").trim();
      if (isMissingValue(value)) return;
      const key = value.toLowerCase();
      seen.set(key, [...(seen.get(key) ?? []), rowIndex]);
    });

    for (const indexes of seen.values()) {
      if (indexes.length <= 1) continue;
      for (const rowIndex of indexes.slice(0, 10)) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: sheet.rows[rowIndex]?.[columnIndex] ?? "",
            issueType: "duplicate_id",
            severity: "high",
            message: `${column} has duplicated identifier-like values.`,
            suggestedReviewStep:
              "Verify whether duplicated IDs represent repeated visits, data entry duplication, or an identifier collision.",
          }),
        );
      }
    }
  });

  return issues;
}

function buildTextQualityIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];

  sheet.headers.forEach((column, columnIndex) => {
    sheet.rows.forEach((row, rowIndex) => {
      const value = row[columnIndex] ?? "";
      if (isMissingValue(value)) return;

      if (/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/u.test(value)) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType: "encoding_problem",
            severity: "medium",
            message: `${column} contains replacement or control characters.`,
            suggestedReviewStep:
              "Re-export the file with UTF-8 encoding or correct the affected value.",
          }),
        );
      } else if (/\s{2,}/u.test(value)) {
        issues.push(
          createReviewIssue({
            file,
            sheet,
            column,
            rowNumber: rowIndex + 2,
            currentValue: value,
            issueType: "whitespace_problem",
            severity: "low",
            message: `${column} contains repeated whitespace.`,
            suggestedReviewStep:
              "Trim whitespace and review whether categories should be harmonized.",
          }),
        );
      }
    });
  });

  return issues.slice(0, 30);
}

function buildUnexpectedCategoryIssues(file: UploadedFileRecord, sheet: ParsedSheet) {
  const issues: ReviewIssue[] = [];

  sheet.headers.forEach((column, columnIndex) => {
    if (!isCategoricalColumn(column, sheet.rows.map((row) => row[columnIndex] ?? ""))) {
      return;
    }

    const counts = new Map<string, number>();
    const firstRowByValue = new Map<string, number>();
    sheet.rows.forEach((row, rowIndex) => {
      const value = (row[columnIndex] ?? "").trim();
      if (isMissingValue(value)) return;
      const key = value.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
      if (!firstRowByValue.has(key)) firstRowByValue.set(key, rowIndex);
    });

    if (counts.size < 4) return;

    const rareValues = Array.from(counts.entries()).filter(([, count]) => count === 1);
    if (rareValues.length === 0 || rareValues.length > Math.max(1, counts.size * 0.25)) {
      return;
    }

    for (const [value] of rareValues.slice(0, 5)) {
      const rowIndex = firstRowByValue.get(value) ?? 0;
      issues.push(
        createReviewIssue({
          file,
          sheet,
          column,
          rowNumber: rowIndex + 2,
          currentValue: sheet.rows[rowIndex]?.[columnIndex] ?? value,
          issueType: "unexpected_category",
          severity: "low",
          message: `${column} has a rare category that may be a spelling or reporting variation.`,
          suggestedReviewStep:
            "Compare this category with expected choices before grouping it in analysis.",
        }),
      );
    }
  });

  return issues;
}

function createReviewIssue({
  file,
  sheet,
  column,
  rowNumber,
  currentValue,
  issueType,
  severity,
  message,
  suggestedReviewStep,
  suggestedValue,
  index = 0,
}: {
  file: UploadedFileRecord;
  sheet: ParsedSheet;
  column: string;
  rowNumber: number;
  currentValue: string;
  issueType: string;
  severity: ReviewIssue["severity"];
  message: string;
  suggestedReviewStep: string;
  suggestedValue?: string;
  index?: number;
}): ReviewIssue {
  const safeCurrentValue = currentValue.slice(0, 160);
  const generatedSuggestion =
    suggestedValue ??
    suggestCorrectedValue({
      sheet,
      column,
      rowNumber,
      currentValue: safeCurrentValue,
      issueType,
      message,
    });

  return {
    id: `${file.id}:${slugify(sheet.name) || "sheet"}:${issueType}:${rowNumber}:${
      slugify(column) || "row"
    }:${index}`,
    fileId: file.id,
    fileName: file.name,
    sheetName: sheet.name,
    column,
    rowNumber,
    currentValue: safeCurrentValue,
    suggestedValue: generatedSuggestion,
    status: "open",
    severity,
    issueType,
    message,
    suggestedReviewStep,
    agentMessageFr: message,
    agentSubtextEn: suggestedReviewStep,
  };
}

function runReviewAgent(issues: ReviewIssue[], sheets: ParsedSheet[]) {
  return issues.map((issue) => {
    const sheet = sheets.find((candidate) => candidate.name === issue.sheetName);
    const columnProfile = sheet?.missingByColumn.find(
      (column) => column.column === issue.column,
    );
    const context = {
      missingPercent: columnProfile?.missingPercent ?? 0,
      rowCount: sheet?.rowCount ?? 0,
    };
    const explanation = explainIssueForReader(issue, context);

    return {
      ...issue,
      message: explanation.fr,
      suggestedReviewStep: explanation.en,
      agentMessageFr: explanation.fr,
      agentSubtextEn: explanation.en,
    };
  });
}

function suggestCorrectedValue({
  sheet,
  column,
  rowNumber,
  currentValue,
  issueType,
  message,
}: {
  sheet: ParsedSheet;
  column: string;
  rowNumber: number;
  currentValue: string;
  issueType: string;
  message: string;
}) {
  const columnIndex = sheet.headers.indexOf(column);
  const row = sheet.rows[rowNumber - 2] ?? [];
  const values =
    columnIndex >= 0 ? sheet.rows.map((item) => item[columnIndex] ?? "") : [];

  if (issueType === "whitespace_problem") {
    return currentValue.trim().replace(/\s+/g, " ");
  }

  if (issueType === "encoding_problem") {
    return currentValue.replace(/[\uFFFD\x00-\x08\x0B\x0C\x0E-\x1F]/gu, "").trim();
  }

  if (issueType === "unexpected_category") {
    return closestCommonCategory(currentValue, values) || mostCommonValue(values) || currentValue;
  }

  if (issueType === "missing_value") {
    if (isNumericColumn(values)) return medianValue(values) ?? "A completer";
    if (isDateLikeColumn(column, values)) return nearestNonMissingValue(values, rowNumber - 2) ?? "A completer";
    return mostCommonValue(values) || "A completer";
  }

  if (
    issueType.endsWith("_out_of_range") ||
    issueType === "numeric_outlier" ||
    issueType === "numeric_parse_failed" ||
    issueType === "mixed_datatypes"
  ) {
    const cleanedNumber = extractNumber(currentValue);
    if (
      cleanedNumber !== null &&
      (issueType === "numeric_parse_failed" || issueType === "mixed_datatypes")
    ) {
      return formatNumberSuggestion(cleanedNumber);
    }

    if (issueType === "age_out_of_range") {
      const ageFromDates = inferAgeFromRow(sheet, row);
      if (ageFromDates !== null) return String(ageFromDates);
    }

    return medianValue(values) ?? "A verifier";
  }

  if (issueType === "plausible_but_conflicting_age") {
    const ageFromDates = inferAgeFromRow(sheet, row);
    return ageFromDates === null ? "A verifier" : String(ageFromDates);
  }

  if (
    issueType === "invalid_date" ||
    issueType === "implausible_date" ||
    issueType === "inconsistent_date_formats"
  ) {
    const normalized = normalizedDateSuggestion(currentValue);
    return normalized ?? nearestNonMissingDate(values, rowNumber - 2) ?? "A verifier";
  }

  if (issueType === "date_sequence_conflict") {
    const earlierColumn = message.match(/before\s+(.+)\.$/u)?.[1];
    const earlierIndex =
      earlierColumn === undefined ? -1 : sheet.headers.indexOf(earlierColumn);
    const earlierValue = earlierIndex >= 0 ? row[earlierIndex] ?? "" : "";
    const normalized = normalizedDateSuggestion(earlierValue);
    return normalized ?? (earlierValue || "A verifier");
  }

  if (issueType === "duplicate_id" || issueType === "duplicate_rows") {
    return "Confirmer ou corriger";
  }

  return currentValue || "A verifier";
}

function isNumericColumn(values: string[]) {
  const present = values.filter((value) => !isMissingValue(value));
  if (present.length === 0) return false;

  const numericCount = present.filter((value) => parseNumber(value) !== null).length;
  return numericCount / present.length >= 0.6;
}

function medianValue(values: string[]) {
  const numbers = values
    .filter((value) => !isMissingValue(value))
    .map(parseNumber)
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);

  if (numbers.length === 0) return null;

  const middle = Math.floor(numbers.length / 2);
  const median =
    numbers.length % 2 === 0 ? (numbers[middle - 1] + numbers[middle]) / 2 : numbers[middle];
  return formatNumberSuggestion(median);
}

function mostCommonValue(values: string[]) {
  const counts = new Map<string, number>();

  for (const value of values) {
    const normalized = value.trim();
    if (isMissingValue(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

function nearestNonMissingValue(values: string[], rowIndex: number) {
  for (let offset = 1; offset < values.length; offset += 1) {
    const before = values[rowIndex - offset];
    if (before !== undefined && !isMissingValue(before)) return before;

    const after = values[rowIndex + offset];
    if (after !== undefined && !isMissingValue(after)) return after;
  }

  return null;
}

function nearestNonMissingDate(values: string[], rowIndex: number) {
  const nearest = nearestNonMissingValue(values, rowIndex);
  if (!nearest) return null;

  return normalizedDateSuggestion(nearest) ?? nearest;
}

function extractNumber(value: string) {
  const match = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/u);
  if (!match) return null;

  const numberValue = Number(match[0]);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatNumberSuggestion(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);
}

function normalizedDateSuggestion(value: string) {
  const parsed = parseDateValue(value);
  return parsed ? parsed.toISOString().slice(0, 10) : null;
}

function inferAgeFromRow(sheet: ParsedSheet, row: string[]) {
  const dobEntry = sheet.headers
    .map((header, index) => ({ header, index }))
    .find(({ header }) => {
      const normalized = normalizeColumn(header);
      return normalized.includes("date_de_naissance") || normalized.includes("birth");
    });
  if (!dobEntry) return null;

  const dob = parseDateValue(row[dobEntry.index] ?? "");
  if (!dob) return null;

  const eventEntry = sheet.headers
    .map((header, index) => ({ header, index }))
    .find(({ header, index }) => index !== dobEntry.index && isDateLikeColumn(header, [row[index] ?? ""]));
  if (!eventEntry) return null;

  const eventDate = parseDateValue(row[eventEntry.index] ?? "");
  if (!eventDate) return null;

  const calculatedAge = Math.floor(
    (eventDate.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return calculatedAge >= 0 && calculatedAge <= 120 ? calculatedAge : null;
}

function closestCommonCategory(currentValue: string, values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (isMissingValue(normalized)) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }

  const candidates = Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
  if (candidates.length === 0) return "";

  return candidates
    .map((candidate) => ({
      candidate,
      distance: levenshtein(currentValue.toLowerCase(), candidate.toLowerCase()),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.candidate ?? "";
}

function levenshtein(left: string, right: string) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    const current = [leftIndex + 1];

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      current[rightIndex + 1] =
        left[leftIndex] === right[rightIndex]
          ? previous[rightIndex]
          : Math.min(
              previous[rightIndex] + 1,
              current[rightIndex] + 1,
              previous[rightIndex + 1] + 1,
            );
    }

    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length];
}

function explainIssueForReader(
  issue: ReviewIssue,
  context: { missingPercent: number; rowCount: number },
) {
  const columnText = issue.column ? `la colonne ${issue.column}` : "cette ligne";
  const rowText = `ligne ${issue.rowNumber}`;

  switch (issue.issueType) {
    case "mostly_empty_column":
      return {
        fr: `La colonne ${issue.column} est presque toujours vide. Pour ce fichier, cela ressemble plutot a un champ optionnel ou non utilise qu'a une erreur ligne par ligne.`,
        en: `${issue.column} is ${context.missingPercent}% missing across ${context.rowCount} rows. Treat it as an optional/unused field unless it is required for this import.`,
      };
    case "missing_value":
      return {
        fr: `Une valeur manque dans ${columnText} a la ${rowText}. Verifiez si cette information doit etre completee ou si l'absence est normale pour ce dossier.`,
        en: `Missing value in ${issue.column || "row"} at row ${issue.rowNumber}. Missing rate for this column is ${context.missingPercent}%.`,
      };
    case "age_out_of_range":
      return {
        fr: `L'age indique a la ${rowText} semble impossible ou hors limites attendues. Confirmez l'age dans la fiche source avant import.`,
        en: `Age value '${issue.currentValue}' is outside the expected range of 0 to 120.`,
      };
    case "bmi_out_of_range":
      return {
        fr: `L'IMC indique a la ${rowText} est hors de la plage attendue. Cela peut venir d'une erreur de saisie ou d'un probleme d'unite.`,
        en: `BMI/IMC value '${issue.currentValue}' is outside the expected range of 8 to 80.`,
      };
    case "weight_out_of_range":
      return {
        fr: `Le poids indique a la ${rowText} est hors de la plage attendue. Verifiez la valeur et l'unite avant import.`,
        en: `Weight value '${issue.currentValue}' is outside the expected range of 1 to 250 kg.`,
      };
    case "height_out_of_range":
      return {
        fr: `La taille indiquee a la ${rowText} est hors de la plage attendue. Verifiez si la valeur est en metres ou dans une autre unite.`,
        en: `Height value '${issue.currentValue}' is outside the expected range of 0.3 to 2.5 meters.`,
      };
    case "numeric_parse_failed":
    case "mixed_datatypes":
      return {
        fr: `${columnText} contient une valeur qui ne correspond pas au format attendu a la ${rowText}. Verifiez si ce champ doit etre numerique ou textuel.`,
        en: `Value '${issue.currentValue}' does not match the expected data type for ${issue.column}.`,
      };
    case "implausible_date":
      return {
        fr: `La date indiquee dans ${columnText} a la ${rowText} semble impossible, trop ancienne ou dans le futur. Confirmez la date source.`,
        en: `Date value '${issue.currentValue}' is a likely placeholder, too old, or in the future.`,
      };
    case "invalid_date":
      return {
        fr: `La date dans ${columnText} a la ${rowText} n'est pas lisible. Corrigez le format de date avant import.`,
        en: `Date value '${issue.currentValue}' could not be parsed as a valid date.`,
      };
    case "date_sequence_conflict":
      return {
        fr: `La chronologie semble incoherente a la ${rowText}. Une date de fin ou de resultat arrive avant une date de debut ou d'evenement precedent.`,
        en: `Date sequence conflict involving ${issue.column} at row ${issue.rowNumber}; current value is '${issue.currentValue}'.`,
      };
    case "plausible_but_conflicting_age":
      return {
        fr: `L'age declare a la ${rowText} ne correspond pas aux dates disponibles. Verifiez la date de naissance, la date d'evenement et l'age.`,
        en: `Reported age conflicts with birth-date-derived age for row ${issue.rowNumber}.`,
      };
    case "duplicate_id":
      return {
        fr: `Le meme identifiant apparait plusieurs fois dans ${columnText}. Verifiez s'il s'agit d'une visite repetee attendue ou d'un doublon.`,
        en: `Identifier-like value '${issue.currentValue}' appears more than once in ${issue.column}.`,
      };
    case "duplicate_rows":
      return {
        fr: `Cette ligne ressemble a une copie exacte d'une autre ligne. Confirmez si c'est un enregistrement repete valide ou un doublon.`,
        en: `An exact duplicate row was detected near row ${issue.rowNumber}.`,
      };
    case "encoding_problem":
      return {
        fr: `${columnText} contient des caracteres illisibles a la ${rowText}. Reexportez le fichier en UTF-8 ou corrigez la valeur.`,
        en: `Encoding/control character problem in ${issue.column}; value preview: '${issue.currentValue}'.`,
      };
    case "whitespace_problem":
      return {
        fr: `${columnText} contient des espaces repetes a la ${rowText}. Nettoyez la valeur si elle sert aux regroupements ou categories.`,
        en: `Repeated whitespace detected in ${issue.column}; value preview: '${issue.currentValue}'.`,
      };
    case "unexpected_category":
      return {
        fr: `Une valeur rare apparait dans ${columnText} a la ${rowText}. Verifiez si c'est une categorie valide ou une faute de saisie.`,
        en: `Rare category '${issue.currentValue}' detected in ${issue.column}.`,
      };
    default:
      return {
        fr: `Le controle qualite a signale un point a verifier dans ${columnText} a la ${rowText}. Confirmez la valeur avant import.`,
        en: `${issue.issueType}: ${issue.message}`,
      };
  }
}

const NUMERIC_RULES: Array<[string, number, number, string]> = [
  ["age", 0, 120, "age_out_of_range"],
  ["imc", 8, 80, "bmi_out_of_range"],
  ["bmi", 8, 80, "bmi_out_of_range"],
  ["poids", 1, 250, "weight_out_of_range"],
  ["weight", 1, 250, "weight_out_of_range"],
  ["taille", 0.3, 2.5, "height_out_of_range"],
  ["height", 0.3, 2.5, "height_out_of_range"],
  ["distance", 0, 300, "distance_out_of_range"],
  ["duree", 0, 72, "duration_out_of_range"],
  ["duration", 0, 72, "duration_out_of_range"],
  ["montant", 0, 100_000_000, "amount_out_of_range"],
  ["amount", 0, 100_000_000, "amount_out_of_range"],
  ["score", 0, 100, "score_out_of_range"],
  ["total_participants", 0, 10_000, "participant_count_out_of_range"],
  ["nombre", 0, 1_000_000, "count_out_of_range"],
  ["count", 0, 1_000_000, "count_out_of_range"],
];

function normalizeColumn(name: string) {
  return name
    .trim()
    .replace(/@/g, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^0-9A-Za-z]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function numericRuleMatches(column: string, token: string) {
  const normalized = normalizeColumn(column);
  const tokens = new Set(normalized.split("_").filter(Boolean));

  if (token === "age") return tokens.has("age") && !tokens.has("tranche");
  if (token === "total_participants") return normalized.includes("total_participants");
  return tokens.has(token);
}

function parseNumber(value: string) {
  if (isMissingValue(value)) return null;

  const normalized = value.replace(/\s+/g, "").replace(",", ".");
  if (!/^-?\d+(?:\.\d+)?$/u.test(normalized)) return null;

  const numberValue = Number(normalized);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function quantile(values: number[], percentile: number) {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * percentile;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sorted[base + 1];

  return next === undefined ? sorted[base] : sorted[base] + rest * (next - sorted[base]);
}

function isDateLikeColumn(column: string, values: string[]) {
  const normalized = normalizeColumn(column);
  const tokens = new Set(normalized.split("_").filter(Boolean));
  const hasDateName = [
    "date",
    "time",
    "heure",
    "jour",
    "received",
    "started",
    "completed",
    "naissance",
    "birth",
  ].some((token) => tokens.has(token));

  if (hasDateName) {
    return true;
  }

  const present = values.filter((value) => !isMissingValue(value)).slice(0, 100);
  if (present.length < 5) return false;

  const clearlyDateFormatted = present.filter((value) => dateFormatHint(value)).length;
  if (clearlyDateFormatted / present.length < 0.8) return false;

  const parseable = present.filter((value) => parseDateValue(value) !== null).length;
  return parseable / present.length >= 0.8;
}

function parseDateValue(value: string) {
  if (isMissingValue(value)) return null;

  const text = value.trim();
  const isoMatch = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/u);
  if (isoMatch) {
    return makeUtcDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const dayFirstMatch = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/u);
  if (dayFirstMatch) {
    const first = Number(dayFirstMatch[1]);
    const second = Number(dayFirstMatch[2]);
    const year = Number(dayFirstMatch[3]);

    if (first > 12) return makeUtcDate(year, second, first);
    if (second > 12) return makeUtcDate(year, first, second);

    return makeUtcDate(year, second, first);
  }

  return null;
}

function makeUtcDate(year: number, month: number, day: number) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

function dateFormatHint(value: string) {
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/u.test(text)) return "yyyy-mm-dd";
  if (/^\d{4}\/\d{2}\/\d{2}/u.test(text)) return "yyyy/mm/dd";
  if (/^\d{2}\/\d{2}\/\d{4}/u.test(text)) return "dd/mm/yyyy_or_mm/dd/yyyy";
  if (/^\d{2}-\d{2}-\d{4}/u.test(text)) return "dd-mm-yyyy_or_mm-dd-yyyy";
  return "";
}

function comparableDatePairs(dateColumns: string[]) {
  const normalized = dateColumns.map((column) => ({
    column,
    key: normalizeColumn(column),
  }));
  const pairs: Array<[string, string]> = [];

  for (const [startToken, endToken] of [
    ["start", "end"],
    ["started", "completed"],
    ["debut", "fin"],
    ["naissance", "consultation"],
    ["birth", "visit"],
  ]) {
    const starts = normalized.filter(({ key }) => key.includes(startToken));
    const ends = normalized.filter(({ key }) => key.includes(endToken));

    for (const start of starts.slice(0, 2)) {
      for (const end of ends.slice(0, 2)) {
        if (start.column !== end.column) pairs.push([start.column, end.column]);
      }
    }
  }

  for (const [earlierToken, laterToken] of [
    ["date_du_dpistage", "date_du_rsultat"],
    ["date_du_depistage", "date_du_resultat"],
    ["date_du_rsultat", "date_de_prise_de_medicament"],
    ["date_du_resultat", "date_de_prise_de_medicament"],
    ["date_de_prise_de_medicament", "date_du_jour_fin_de_traitement"],
    ["heure_appel", "heure_depart_bureau"],
    ["heure_depart_bureau", "heure_arive_au_csb"],
  ]) {
    const earlier = normalized.find(({ key }) => key.includes(earlierToken));
    const later = normalized.find(({ key }) => key.includes(laterToken));
    if (earlier && later && earlier.column !== later.column) {
      pairs.push([earlier.column, later.column]);
    }
  }

  return Array.from(new Map(pairs.map((pair) => [`${pair[0]}|${pair[1]}`, pair])).values());
}

function isIdentifierColumn(column: string) {
  const normalized = normalizeColumn(column);
  const tokens = normalized.split("_").filter(Boolean);
  const exactIdentifierTokens = new Set(["id", "uuid", "uid", "barcode", "formid"]);

  if (tokens.some((token) => exactIdentifierTokens.has(token))) return true;
  if (tokens.includes("case") && tokens.includes("id")) return true;
  if (normalized.endsWith("_id") || normalized.startsWith("id_")) return true;

  return false;
}

function isCategoricalColumn(column: string, values: string[]) {
  if (isIdentifierColumn(column)) return false;

  const present = values.filter((value) => !isMissingValue(value));
  if (present.length === 0) return false;

  const numericValues = present.map(parseNumber);
  const numericRatio =
    numericValues.filter((value) => value !== null).length / present.length;
  if (numericRatio >= 0.8) return false;

  const unique = new Set(present.map((value) => value.trim().toLowerCase())).size;
  return unique >= 2 && unique <= Math.min(50, Math.max(5, Math.floor(present.length * 0.2)));
}

function normalizeCell(cell: string | number | boolean | Date | null | undefined) {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString();
  return String(cell).trim();
}

function isMissingValue(value: string) {
  return ["", "-", "--", "---", "na", "n/a", "nan", "null", "none"].includes(
    value.trim().toLowerCase(),
  );
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function parseJsonRows(text: string) {
  const parsed = JSON.parse(text) as unknown;
  const records = Array.isArray(parsed) ? parsed : [parsed];
  const objects = records.filter(
    (record): record is Record<string, unknown> =>
      typeof record === "object" && record !== null && !Array.isArray(record),
  );
  const headers = Array.from(new Set(objects.flatMap((record) => Object.keys(record))));
  return [
    headers,
    ...objects.map((record) =>
      headers.map((header) => {
        const value = record[header];
        return typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
      }),
    ),
  ];
}

function renderMarkdownSummary(
  file: UploadedFileRecord,
  sheets: ParsedSheet[],
  missingCells: number,
) {
  const lines = [
    `# Upload Summary: ${file.name}`,
    "",
    `- Original file: ${file.name}`,
    `- Detected kind: ${file.kind}`,
    `- Size: ${file.sizeBytes} bytes`,
    `- Sheets/tables: ${sheets.length}`,
    `- Total rows: ${sheets.reduce((sum, sheet) => sum + sheet.rowCount, 0)}`,
    `- Missing cells detected: ${missingCells}`,
    "",
  ];

  for (const sheet of sheets) {
    lines.push(`## ${sheet.name}`, "");
    lines.push(`- Rows: ${sheet.rowCount}`);
    lines.push(`- Columns: ${sheet.columnCount}`);
    lines.push(`- Headers: ${sheet.headers.map((header) => `\`${header}\``).join(", ") || "none"}`);
    lines.push("");
    if (sheet.previewRows.length > 0 && sheet.headers.length > 0) {
      lines.push(renderMarkdownTable(sheet.headers, sheet.previewRows));
      lines.push("");
    }
  }

  return lines.join("\n");
}

function renderMissingDataReport(
  file: UploadedFileRecord,
  sheets: ParsedSheet[],
  missingCells: number,
) {
  const lines = [
    `# Missing Data Report: ${file.name}`,
    "",
    `- Missing cells: ${missingCells}`,
    "",
  ];

  for (const sheet of sheets) {
    const missingColumns = sheet.missingByColumn.filter((column) => column.missingCount > 0);
    lines.push(`## ${sheet.name}`, "");
    if (missingColumns.length === 0) {
      lines.push("- No missing values detected.", "");
      continue;
    }
    lines.push("| Column | Missing count | Missing percent |");
    lines.push("|---|---:|---:|");
    for (const column of missingColumns) {
      lines.push(
        `| ${escapeMarkdown(column.column)} | ${column.missingCount} | ${column.missingPercent}% |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

function renderMarkdownTable(headers: string[], rows: string[][]) {
  const safeHeaders = headers.map(escapeMarkdown);
  const lines = [
    `| ${safeHeaders.join(" |")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
  ];
  for (const row of rows) {
    lines.push(
      `| ${headers
        .map((_, index) => escapeMarkdown(row[index] || ""))
        .join(" | ")} |`,
    );
  }
  return lines.join("\n");
}

function escapeMarkdown(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 160);
}
