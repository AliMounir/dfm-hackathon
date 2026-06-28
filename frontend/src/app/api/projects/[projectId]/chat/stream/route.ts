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
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { language?: "fr" | "en"; message?: string };
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
    },
  });
}
