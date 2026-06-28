import { API_BASE, apiPost } from "@/features/shared/api/client";

import type { ChatResponse, ChatTurn, KpiCard, Section } from "@/features/dashboard/lib/types";

export type WidgetRef = { id: string; kind: "kpi" | "chart"; title: string };

/** Non-streaming fallback. */
export async function postChat(
  projectId: string,
  message: string,
  history: ChatTurn[],
  widgets: WidgetRef[],
): Promise<ChatResponse> {
  return apiPost<ChatResponse>(`/projects/${projectId}/chat`, { message, history, widgets });
}

export type DashboardOp =
  | { kind: "add_chart"; section: Section }
  | { kind: "add_kpi"; kpi: KpiCard }
  | { kind: "remove"; id: string }
  | { kind: "clear" };

export type StreamEvent =
  | { type: "token"; text: string }
  | { type: "op"; op: DashboardOp }
  | { type: "done" };

/** Streaming chat (SSE): calls `on` for each token / op / done event. */
export async function streamChat(
  projectId: string,
  message: string,
  history: ChatTurn[],
  widgets: WidgetRef[],
  on: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, widgets }),
  });
  if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf("\n\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 2);
      if (line.startsWith("data:")) {
        try {
          on(JSON.parse(line.slice(5).trim()) as StreamEvent);
        } catch {
          /* ignore malformed frame */
        }
      }
    }
  }
}
