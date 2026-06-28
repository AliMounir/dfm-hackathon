import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { projectId } = await context.params;

  try {
    const supabase = createSupabaseServerClient();
    const filesResult = await supabase
      .from("project_files")
      .select(
        "id,batch_id,project_id,original_filename,storage_bucket,storage_path,mime_type,kind,size_bytes,status,created_at,updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (filesResult.error) {
      return NextResponse.json({ error: filesResult.error.message }, { status: 500 });
    }

    const batchesResult = await supabase
      .from("upload_batches")
      .select(
        "id,project_id,status,source,file_count,error_message,created_at,updated_at,upload_workflow_steps(step_key,status,sort_order,message,created_at,updated_at)",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (batchesResult.error) {
      return NextResponse.json({ error: batchesResult.error.message }, { status: 500 });
    }

    return NextResponse.json({
      projectId,
      files: filesResult.data.map((file) => ({
        id: file.id,
        batchId: file.batch_id,
        projectId: file.project_id,
        name: file.original_filename,
        bucket: file.storage_bucket,
        storagePath: file.storage_path,
        mimeType: file.mime_type,
        kind: file.kind,
        sizeBytes: file.size_bytes,
        status: file.status,
        createdAt: file.created_at,
        updatedAt: file.updated_at,
      })),
      batches: batchesResult.data.map((batch) => ({
        id: batch.id,
        projectId: batch.project_id,
        status: batch.status,
        source: batch.source,
        fileCount: batch.file_count,
        errorMessage: batch.error_message,
        createdAt: batch.created_at,
        updatedAt: batch.updated_at,
        steps: normalizeSteps(batch.upload_workflow_steps),
      })),
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

function normalizeSteps(
  steps:
    | Array<{
        step_key: string;
        status: string;
        sort_order: number;
        message: string | null;
        created_at: string;
        updated_at: string;
      }>
    | {
        step_key: string;
        status: string;
        sort_order: number;
        message: string | null;
        created_at: string;
        updated_at: string;
      }
    | null,
) {
  const normalizedSteps = Array.isArray(steps) ? steps : steps ? [steps] : [];

  return normalizedSteps
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((step) => ({
      key: step.step_key,
      status: step.status,
      order: step.sort_order,
      message: step.message,
      createdAt: step.created_at,
      updatedAt: step.updated_at,
    }));
}
