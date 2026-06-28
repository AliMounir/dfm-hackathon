import { NextResponse } from "next/server";

import {
  createDashboardPlan,
  createOverviewDashboardPlan,
  findProject,
} from "@/lib/dashboard-api";
import { backendResponse, fetchBackendApi } from "@/lib/backend-proxy";

export const runtime = "nodejs";

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

  const backend = await fetchBackendApi(`/projects/${projectId}/dashboard`);
  if (backend?.ok) {
    return backendResponse(backend);
  }

  const project = findProject(projectId);
  if (!project) {
    if (backend) return backendResponse(backend);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(createDashboardPlan(project), {
    headers: {
      "x-hazava-backend": "local-fallback",
    },
  });
}
