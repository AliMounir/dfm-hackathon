import { NextResponse } from "next/server";

import { createChatResponse, findProject } from "@/lib/dashboard-api";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const project = findProject(projectId);

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string };

  return NextResponse.json(createChatResponse(project, body.message ?? ""));
}
