import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    batchId: string;
  }>;
};

type WorkflowStatus = "done" | "active" | "waiting" | "error";

const VALID_STATUSES: WorkflowStatus[] = ["done", "active", "waiting", "error"];

export async function PATCH(request: Request, context: RouteContext) {
  const { batchId } = await context.params;
  const payload = (await request.json()) as {
    stepKey?: string;
    status?: WorkflowStatus;
    message?: string;
    batchStatus?: string;
  };

  if (!payload.stepKey) {
    return NextResponse.json({ error: "stepKey is required." }, { status: 400 });
  }

  if (!payload.status || !VALID_STATUSES.includes(payload.status)) {
    return NextResponse.json(
      { error: "status must be one of: done, active, waiting, error." },
      { status: 400 },
    );
  }

  try {
    const supabase = createSupabaseServerClient();
    const stepResult = await supabase
      .from("upload_workflow_steps")
      .update({
        status: payload.status,
        message: payload.message ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("batch_id", batchId)
      .eq("step_key", payload.stepKey)
      .select("id,batch_id,project_id,step_key,status,sort_order,message,updated_at")
      .single();

    if (stepResult.error) {
      return NextResponse.json({ error: stepResult.error.message }, { status: 500 });
    }

    if (payload.batchStatus) {
      const batchResult = await supabase
        .from("upload_batches")
        .update({
          status: payload.batchStatus,
          error_message:
            payload.status === "error" ? payload.message ?? "Workflow step failed." : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batchId);

      if (batchResult.error) {
        return NextResponse.json({ error: batchResult.error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      step: {
        id: stepResult.data.id,
        batchId: stepResult.data.batch_id,
        projectId: stepResult.data.project_id,
        key: stepResult.data.step_key,
        status: stepResult.data.status,
        order: stepResult.data.sort_order,
        message: stepResult.data.message,
        updatedAt: stepResult.data.updated_at,
      },
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
