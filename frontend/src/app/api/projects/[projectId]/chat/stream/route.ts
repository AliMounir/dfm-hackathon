import { createChatResponse, findProject } from "@/lib/dashboard-api";
import {
  backendResponse,
  backendUnavailableResponse,
  fetchBackendApi,
  getBackendApiBase,
} from "@/lib/backend-proxy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    projectId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { projectId } = await context.params;
  const bodyText = await request.text();
  const backendPath = `/projects/${projectId}/chat/stream`;
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
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = parseJsonBody(bodyText) as { language?: "fr" | "en"; message?: string };
  const response = createChatResponse(project, body.message ?? "");
  const encoder = new TextEncoder();
  const reply = body.language === "en" ? response.reply.en : response.reply.fr;
  const tokens = reply.match(/\S+\s*/g) ?? [reply];

  const stream = new ReadableStream({
    start(controller) {
      for (const token of tokens) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", text: token })}\n\n`));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
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
