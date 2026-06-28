import { getBackendApiConfig } from "@/lib/backend-proxy";

export const runtime = "nodejs";

export async function GET() {
  const config = getBackendApiConfig();

  if (!config) {
    return Response.json(
      {
        configured: false,
        ok: false,
        error: "BACKEND_API_URL is not set for this deployment.",
        legacyFallback: "NEXT_PUBLIC_API_URL is also accepted for this prototype.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(`${config.base}/health`, { cache: "no-store" });
    const text = await response.text();

    return Response.json(
      {
        configured: true,
        backendUrl: config.base,
        source: config.source,
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
        backendUrl: config.base,
        source: config.source,
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
