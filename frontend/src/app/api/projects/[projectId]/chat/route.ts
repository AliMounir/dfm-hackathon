import { NextResponse } from "next/server";

import { createChatResponse, findProject } from "@/lib/dashboard-api";
import { backendResponse, fetchBackendApi } from "@/lib/backend-proxy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const bodyText = await request.text();
  const backend = await fetchBackendApi(`/projects/${projectId}/chat`, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("Content-Type") ?? "application/json" },
    body: bodyText,
  });

  if (backend?.ok) {
    return backendResponse(backend);
  }

  const project = findProject(projectId);

  if (!project) {
    if (backend) return backendResponse(backend);
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = parseJsonBody(bodyText) as { message?: string };

  return NextResponse.json(createChatResponse(project, body.message ?? ""), {
    headers: {
      "x-hazava-backend": "local-fallback",
    },
  });
}

function parseJsonBody(bodyText: string): unknown {
  try {
    return bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return {};
  }
}
