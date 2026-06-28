"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, PanelRightClose, PanelRightOpen, SendHorizontal, Trash2 } from "lucide-react";

import { postChat, streamChat, type DashboardOp, type WidgetRef } from "@/features/dashboard/api/chat";
import { useDashboard } from "@/features/dashboard/lib/dashboard-context";
import { t } from "@/features/shared/lib/i18n";

type Msg = { role: "user" | "assistant"; content: string; note?: string };

export function ChatPanel({
  isOpen,
  onToggle,
  projectName,
}: {
  isOpen: boolean;
  onToggle: () => void;
  projectName?: string | null;
}) {
  const { projectId, language, plan, applyOp } = useDashboard();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeProjectRef = useRef<string | null>(projectId);
  const fr = language === "fr";

  // Load THIS project's history when the selected project changes.
  useEffect(() => {
    activeProjectRef.current = projectId;
    if (!projectId || typeof window === "undefined") {
      setMessages([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(`dfm-chat-${projectId}`);
      setMessages(raw ? (JSON.parse(raw) as Msg[]) : []);
    } catch {
      setMessages([]);
    }
  }, [projectId]);

  // Persist to the project the current messages belong to. Deps are [messages]
  // only — so switching projects never writes the old messages under the new key.
  useEffect(() => {
    const pid = activeProjectRef.current;
    if (!pid || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`dfm-chat-${pid}`, JSON.stringify(messages));
    } catch {
      /* ignore quota errors */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  function patchLast(patch: (prev: Msg) => Msg) {
    setMessages((m) => {
      const c = [...m];
      c[c.length - 1] = patch(c[c.length - 1]);
      return c;
    });
  }

  function applyOpWithNote(op: DashboardOp, changes: string[]) {
    applyOp(op);
    if (op.kind === "clear") changes.push(fr ? "réinitialisé" : "cleared");
    else if (op.kind === "add_chart") changes.push(fr ? "+graphique" : "+chart");
    else if (op.kind === "add_kpi") changes.push("+KPI");
    else if (op.kind === "remove") changes.push(fr ? "−retiré" : "−removed");
  }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || sending || !projectId) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: msg }, { role: "assistant", content: "" }]);
    setInput("");
    setSending(true);

    const widgets: WidgetRef[] = plan
      ? [
          ...plan.kpis.map((k) => ({ id: k.id ?? "", kind: "kpi" as const, title: t(k.title, language) })),
          ...plan.sections.map((s) => ({ id: s.id ?? "", kind: "chart" as const, title: t(s.title, language) })),
        ]
      : [];
    const changes: string[] = [];
    let received = false;

    try {
      await streamChat(projectId, msg, history, widgets, language, (event) => {
        received = true;
        if (event.type === "token") patchLast((p) => ({ ...p, content: p.content + event.text }));
        else if (event.type === "op") applyOpWithNote(event.op, changes);
      });
    } catch {
      received = false;
    }

    if (!received) {
      try {
        const res = await postChat(projectId, msg, history, widgets, language);
        patchLast((p) => ({ ...p, content: t(res.reply, language) || p.content }));
        if (res.clear) applyOpWithNote({ kind: "clear" }, changes);
        (res.add_charts ?? []).forEach((s) => applyOpWithNote({ kind: "add_chart", section: s }, changes));
        (res.add_kpis ?? []).forEach((k) => applyOpWithNote({ kind: "add_kpi", kpi: k }, changes));
        (res.remove_ids ?? []).forEach((id) => applyOpWithNote({ kind: "remove", id }, changes));
      } catch {
        patchLast((p) => ({
          ...p,
          content: p.content || (fr ? "Assistant temporairement indisponible." : "Assistant temporarily unavailable."),
        }));
      }
    }

    // Make sure something shows even if only the dashboard changed.
    patchLast((p) => ({
      ...p,
      content: p.content || (fr ? "Tableau de bord mis à jour." : "Dashboard updated."),
      note: changes.length ? changes.join(" · ") : p.note,
    }));
    setSending(false);
  }

  if (!isOpen) {
    return (
      <aside className="fixed inset-y-0 right-0 z-20 hidden w-14 flex-col border-l border-stone-200 bg-white shadow-sm lg:flex">
        <button
          type="button"
          aria-label={fr ? "Ouvrir l'assistant" : "Open assistant"}
          className="flex h-14 items-center justify-center border-b border-stone-200 text-stone-600 hover:bg-stone-100"
          onClick={onToggle}
        >
          <PanelRightOpen className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="flex flex-1 items-center justify-center">
          <div className="-rotate-90 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-stone-400">
            Assistant
          </div>
        </div>
      </aside>
    );
  }

  const suggestions = fr
    ? ["Concentre-toi sur le jeu de données ACCOUCHEMENT et génère des analyses", "Montre l'activité par site", "Quels fichiers avons-nous pour ce projet ?"]
    : ["Focus on the ACCOUCHEMENT dataset and generate insights", "Show activity by site", "Which files do we have for this project?"];

  return (
    <aside className="fixed inset-y-0 right-0 z-20 hidden w-[380px] flex-col border-l border-stone-200 bg-white shadow-sm lg:flex">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-stone-200 px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#153B36] text-[#F5F3EF] ring-2 ring-[#F4A623]/25">
            <Bot className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-stone-950">{fr ? "Assistant M&E" : "M&E Assistant"}</h2>
            <p className="truncate text-xs text-stone-500">{projectName ?? (fr ? "Aucun projet" : "No project")}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={fr ? "Effacer" : "Clear"}
            title={fr ? "Effacer l'historique" : "Clear history"}
            onClick={() => setMessages([])}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={fr ? "Fermer" : "Close"}
            onClick={onToggle}
            className="rounded-md p-2 text-stone-500 hover:bg-stone-100"
          >
            <PanelRightClose className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-stone-50 p-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="rounded-lg bg-white p-3 text-sm leading-relaxed text-stone-700 shadow-sm">
              {fr
                ? "Bonjour. Je lis les données du projet, j'explique les tendances et je peux modifier le tableau de bord (ajouter des graphiques, approfondir un jeu de données)."
                : "Hello. I read the project data, explain trends, and can edit the dashboard (add charts, dig into a dataset)."}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Suggestions</p>
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={!projectId}
                className="block w-full rounded-md border border-stone-200 bg-white px-3 py-2 text-left text-xs text-stone-600 hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
            {!projectId && (
              <p className="text-xs text-stone-400">{fr ? "Sélectionnez un projet pour discuter." : "Select a project to chat."}</p>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white"
                  : "max-w-[92%] rounded-lg bg-white px-3 py-2 text-sm text-stone-800 shadow-sm"
              }
            >
              <p className="whitespace-pre-wrap leading-relaxed">{m.content || (sending && i === messages.length - 1 ? "…" : "")}</p>
              {m.note && <p className="mt-1 text-[11px] font-medium text-emerald-700">{m.note}</p>}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2 border-t border-stone-200 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending || !projectId}
          placeholder={fr ? "Écrivez un message…" : "Type a message…"}
          className="min-w-0 flex-1 rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-emerald-400 disabled:bg-stone-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim() || !projectId}
          className="rounded-md bg-emerald-600 p-2 text-white disabled:opacity-40"
          aria-label="Send"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
}
