const PASSTHROUGH_HEADERS = ["content-type", "cache-control", "x-accel-buffering"];

type BackendApiConfig = {
  base: string;
  source: "BACKEND_API_URL" | "NEXT_PUBLIC_API_URL";
};

export function getBackendApiConfig(): BackendApiConfig | null {
  const preferred = process.env.BACKEND_API_URL?.trim();
  const legacy = process.env.NEXT_PUBLIC_API_URL?.trim();
  const raw = preferred || legacy;
  if (!raw) return null;

  return {
    base: raw.replace(/\/api\/?$/, "").replace(/\/$/, ""),
    source: preferred ? "BACKEND_API_URL" : "NEXT_PUBLIC_API_URL",
  };
}

export function getBackendApiBase(): string | null {
  return getBackendApiConfig()?.base ?? null;
}

export async function fetchBackendApi(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const config = getBackendApiConfig();
  if (!config) return null;

  const apiPath = path.startsWith("/") ? path : `/${path}`;

  try {
    return await fetch(`${config.base}/api${apiPath}`, {
      ...init,
      cache: "no-store",
      headers: init.headers,
    });
  } catch (error) {
    console.error("Backend API proxy failed", error);
    return null;
  }
}

export function backendUnavailableResponse(path: string): Response {
  return Response.json(
    {
      error: "Configured backend is not reachable.",
      path,
      hint: "Check /api/backend/health, Railway deployment logs, and the backend URL env var.",
    },
    {
      status: 502,
      headers: {
        "x-hazava-backend": "unreachable",
      },
    },
  );
}

export function backendResponse(response: Response): Response {
  const headers = new Headers();

  for (const key of PASSTHROUGH_HEADERS) {
    const value = response.headers.get(key);
    if (value) headers.set(key, value);
  }

  headers.set("x-hazava-backend", "railway");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
