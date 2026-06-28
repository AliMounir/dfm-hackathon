import { getBackendApiBase } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function GET() {
  const base = getBackendApiBase();

  if (!base) {
    return Response.json(
      {
        configured: false,
        ok: false,
        error: "BACKEND_API_URL is not set for this Vercel deployment.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${base}/health`, { cache: "no-store" });
    const text = await response.text();

    return Response.json(
      {
        configured: true,
        backendUrl: base,
        ok: response.ok,
        status: response.status,
        response: parseBody(text),
      },
      { status: response.ok ? 200 : 502 },
    );
  } catch (error) {
    return Response.json(
      {
        configured: true,
        backendUrl: base,
        ok: false,
        error: error instanceof Error ? error.message : "Could not reach Railway backend.",
      },
      { status: 502 },
    );
  }
}

function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
