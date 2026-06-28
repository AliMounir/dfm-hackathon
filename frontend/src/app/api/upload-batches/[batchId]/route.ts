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

    const files = (filesResult.data as FileRow[]).map((file) => ({
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
