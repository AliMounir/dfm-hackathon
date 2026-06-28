// Always use the same-origin Next.js API routes. Those server routes decide
// whether to proxy to Railway or use the local prototype fallback.
export const API_BASE = "";

function apiUrl(path: string): string {
  const apiPath = `/api${path}`;
  if (typeof window !== "undefined") return apiPath;

  const serverOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return `${serverOrigin}${apiPath}`;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}
