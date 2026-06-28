// Same-origin by default: Next.js API routes run on localhost and Vercel.
// A non-local NEXT_PUBLIC_API_URL can still be used later for a separate API.
const configuredApiBase = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
const isOldLocalBackend =
  configuredApiBase === "http://localhost:8000" ||
  configuredApiBase === "http://127.0.0.1:8000";

export const API_BASE =
  configuredApiBase && !isOldLocalBackend ? configuredApiBase.replace(/\/$/, "") : "";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}
