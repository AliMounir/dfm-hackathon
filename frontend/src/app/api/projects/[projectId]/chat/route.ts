import { NextResponse } from "next/server";

import { createChatResponse, findProject } from "@/lib/dashboard-api";
import {
  backendResponse,
  backendUnavailableResponse,
  fetchBackendApi,
  getBackendApiBase,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";
// The chat agent (LLM on Railway) can take 20-30s; raise the function timeout
// so Vercel doesn't kill the proxy before the agent replies.
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const bodyText = await request.text();
  const backendPath = `/projects/${projectId}/chat`;
  const backendConfigured = Boolean(getBackendApiBase());
  const backend = await fetchBackendApi(backendPath, {
    method: "POST",
    headers: { "Content-Type": request.headers.get("Content-Type") ?? "application/json" },
    body: bodyText,
  });

  if (backend?.ok) {
    return backendResponse(backend);
  }

  if (backendConfigured) {
    if (backend) return backendResponse(backend);
    return backendUnavailableResponse(backendPath);
  }

  const project = findProject(projectId);

  if (!project) {
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
