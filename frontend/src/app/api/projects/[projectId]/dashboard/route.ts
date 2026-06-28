import { NextResponse } from "next/server";

import {
  createDashboardPlan,
  createOverviewDashboardPlan,
  findProject,
} from "@/lib/dashboard-api";

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

  const project = findProject(projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(createDashboardPlan(project));
}
