const PASSTHROUGH_HEADERS = ["content-type", "cache-control", "x-accel-buffering"];

export function getBackendApiBase(): string | null {
  const raw = process.env.BACKEND_API_URL?.trim();
  if (!raw) return null;

  return raw.replace(/\/api\/?$/, "").replace(/\/$/, "");
}

export async function fetchBackendApi(
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const base = getBackendApiBase();
  if (!base) return null;

  const apiPath = path.startsWith("/") ? path : `/${path}`;

  try {
    return await fetch(`${base}/api${apiPath}`, {
      ...init,
      cache: "no-store",
      headers: init.headers,
    });
  } catch (error) {
    console.error("Backend API proxy failed", error);
    return null;
  }
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
