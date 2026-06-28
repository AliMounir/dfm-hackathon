import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import {
  createSupabaseServerClient,
  getSupabaseServerConfig,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
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

export async function POST(request: Request, context: RouteContext) {
  const { batchId } = await context.params;
  const payload = (await request.json()) as {
    issues?: unknown;
  };

  if (!Array.isArray(payload.issues)) {
    return NextResponse.json({ error: "issues must be an array." }, { status: 400 });
  }

  const issues = payload.issues.filter(isReviewIssue);

  if (issues.length !== payload.issues.length) {
    return NextResponse.json(
      { error: "One or more review issues are invalid." },
      { status: 400 },
    );
  }

  try {
    const config = getSupabaseServerConfig();
    const supabase = createSupabaseServerClient();
    const batchResult = await supabase
      .from("upload_batches")
      .select("id,project_id")
      .eq("id", batchId)
      .single();

    if (batchResult.error) {
      return NextResponse.json({ error: batchResult.error.message }, { status: 404 });
    }

    const storagePath = `${batchResult.data.project_id}/${batchId}/artifacts/review-decisions.json`;
    const body = JSON.stringify(
      {
        batchId,
        projectId: batchResult.data.project_id,
        reviewedAt: new Date().toISOString(),
        issueCount: issues.length,
        issues,
      },
      null,
      2,
    );
    const buffer = Buffer.from(body, "utf8");
    const uploadResult = await supabase.storage
      .from(config.uploadBucket)
      .upload(storagePath, buffer, {
        contentType: "application/json; charset=utf-8",
        upsert: true,
      });

    if (uploadResult.error) {
      return NextResponse.json({ error: uploadResult.error.message }, { status: 500 });
    }

    const existingDecisionResult = await supabase
      .from("project_files")
      .select("id")
      .eq("storage_path", storagePath)
      .maybeSingle();

    if (existingDecisionResult.error) {
      return NextResponse.json(
        { error: existingDecisionResult.error.message },
        { status: 500 },
      );
    }

    const decisionMetadata = {
      batch_id: batchId,
      project_id: batchResult.data.project_id,
      original_filename: "review-decisions.json",
      storage_bucket: config.uploadBucket,
      storage_path: storagePath,
      mime_type: "application/json; charset=utf-8",
      size_bytes: buffer.byteLength,
      kind: "json",
      status: "reviewed",
      updated_at: new Date().toISOString(),
    };

    const metadataResult = existingDecisionResult.data
      ? await supabase
          .from("project_files")
          .update(decisionMetadata)
          .eq("id", existingDecisionResult.data.id)
      : await supabase.from("project_files").insert({
          id: randomUUID(),
          ...decisionMetadata,
        });

    if (metadataResult.error) {
      return NextResponse.json({ error: metadataResult.error.message }, { status: 500 });
    }

    const stepResult = await supabase
      .from("upload_workflow_steps")
      .update({
        status: "done",
        message: `${issues.length} issue(s) reviewed. Ready for final import.`,
        updated_at: new Date().toISOString(),
      })
      .eq("batch_id", batchId)
      .eq("step_key", "approval");

    if (stepResult.error) {
      return NextResponse.json({ error: stepResult.error.message }, { status: 500 });
    }

    const batchUpdateResult = await supabase
      .from("upload_batches")
      .update({
        status: "completed",
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchId);

    if (batchUpdateResult.error) {
      return NextResponse.json(
        { error: batchUpdateResult.error.message },
        { status: 500 },
      );
    }

    await supabase
      .from("project_files")
      .update({ status: "imported", updated_at: new Date().toISOString() })
      .eq("batch_id", batchId)
      .eq("status", "awaiting_approval");

    return NextResponse.json({
      batch: {
        id: batchId,
        status: "completed",
      },
      review: {
        issueCount: issues.length,
        storagePath,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save review.",
      },
      { status: 500 },
    );
  }
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
