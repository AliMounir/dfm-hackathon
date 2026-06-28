import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

type WorkflowStepRow = {
  step_key: string;
  status: string;
  sort_order: number;
  message: string | null;
  created_at: string;
  updated_at: string;
};

type FileRow = {
  id: string;
  original_filename: string;
  storage_bucket: string;
  storage_path: string;
  mime_type: string;
  kind: string;
  size_bytes: number;
  status: string;
  created_at: string;
  updated_at: string;
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

export async function GET(_request: Request, context: RouteContext) {
  const { batchId } = await context.params;

  try {
    const supabase = createSupabaseServerClient();
    const batchResult = await supabase
      .from("upload_batches")
      .select("id,project_id,status,source,file_count,error_message,created_at,updated_at")
      .eq("id", batchId)
      .single();

    if (batchResult.error) {
      return NextResponse.json({ error: batchResult.error.message }, { status: 404 });
    }

    const stepsResult = await supabase
      .from("upload_workflow_steps")
      .select("step_key,status,sort_order,message,created_at,updated_at")
      .eq("batch_id", batchId)
      .order("sort_order", { ascending: true });

    if (stepsResult.error) {
      return NextResponse.json({ error: stepsResult.error.message }, { status: 500 });
    }

    const filesResult = await supabase
      .from("project_files")
      .select(
        "id,original_filename,storage_bucket,storage_path,mime_type,kind,size_bytes,status,created_at,updated_at",
      )
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    if (filesResult.error) {
      return NextResponse.json({ error: filesResult.error.message }, { status: 500 });
    }

    const steps = (stepsResult.data as WorkflowStepRow[]).map((step) => ({
      key: step.step_key,
      status: step.status,
      order: step.sort_order,
      message: step.message,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    }));

    const allFiles = filesResult.data as FileRow[];
    const reviewIssues = await loadReviewIssues(supabase, allFiles);
    const files = allFiles
      .filter((file) => !isInternalArtifact(file))
      .map((file) => ({
      id: file.id,
      name: file.original_filename,
      bucket: file.storage_bucket,
      storagePath: file.storage_path,
      mimeType: file.mime_type,
      kind: file.kind,
      sizeBytes: file.size_bytes,
      status: file.status,
      createdAt: file.created_at,
      updatedAt: file.updated_at,
    }));

    return NextResponse.json({
      batch: {
        id: batchResult.data.id,
        projectId: batchResult.data.project_id,
        status: batchResult.data.status,
        source: batchResult.data.source,
        fileCount: batchResult.data.file_count,
        errorMessage: batchResult.data.error_message,
        createdAt: batchResult.data.created_at,
        updatedAt: batchResult.data.updated_at,
      },
      files,
      reviewIssues,
      stages: steps,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Supabase is not configured.",
      },
      { status: 500 },
    );
  }
}

function isInternalArtifact(file: FileRow) {
  return (
    file.storage_path.includes("/artifacts/") ||
    file.status === "converted" ||
    file.status === "extracted" ||
    file.status === "missing-data-reported" ||
    file.status === "reviewed"
  );
}

async function loadReviewIssues(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  files: FileRow[],
) {
  const extractionFiles = files.filter(
    (file) =>
      file.storage_path.endsWith(".extraction.json") || file.status === "extracted",
  );
  const issues: ReviewIssue[] = [];

  for (const file of extractionFiles) {
    const downloadResult = await supabase.storage
      .from(file.storage_bucket)
      .download(file.storage_path);

    if (downloadResult.error) continue;

    try {
      const text = await downloadResult.data.text();
      const parsed = JSON.parse(text) as { reviewIssues?: unknown };

      if (Array.isArray(parsed.reviewIssues)) {
        issues.push(...parsed.reviewIssues.filter(isReviewIssue));
      }
    } catch {
      continue;
    }
  }

  return issues.slice(0, 100);
}

function isReviewIssue(value: unknown): value is ReviewIssue {
  if (typeof value !== "object" || value === null) return false;

  const issue = value as Record<string, unknown>;
  return (
    typeof issue.id === "string" &&
    typeof issue.fileId === "string" &&
    typeof issue.fileName === "string" &&
    typeof issue.sheetName === "string" &&
    typeof issue.column === "string" &&
    typeof issue.rowNumber === "number" &&
    typeof issue.currentValue === "string" &&
    typeof issue.suggestedValue === "string" &&
    (issue.status === "open" || issue.status === "accepted") &&
    (issue.severity === "high" ||
      issue.severity === "medium" ||
      issue.severity === "low") &&
    typeof issue.issueType === "string" &&
    typeof issue.message === "string" &&
    typeof issue.suggestedReviewStep === "string" &&
    typeof issue.agentMessageFr === "string" &&
    typeof issue.agentSubtextEn === "string"
  );
}
