"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { ChatMessage, Project } from "@/features/chat/lib/types";

const PLACEHOLDER_REPLY: Record<Language, string> = {
  fr: "TODO(DfM) : l'assistant n'est pas encore connecté au modèle. Réponse de démonstration.",
  en: "TODO(DfM): the assistant is not wired to the model yet. Demo reply.",
};

/**
 * Conversational assistant — coordinators ask questions (French-first) about a
 * project. TODO(DfM): POST to the backend /api/chat endpoint and stream.
 */
export function ChatPanel({ project, lang = "fr" }: { project: Project; lang?: Language }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  function send(text: string) {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", content: q }, { role: "assistant", content: PLACEHOLDER_REPLY[lang] }]);
    setInput("");
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-base">
          {lang === "fr" ? "Assistant" : "Assistant"} · {project.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <div className="flex flex-wrap gap-1.5">
          {project.suggestedQuestions.map((qq, idx) => (
            <button
              key={idx}
              onClick={() => send(t(qq, lang))}
              className="rounded-full border px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              {t(qq, lang)}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[80%] rounded-lg bg-neutral-900 px-3 py-2 text-sm text-white"
                  : "mr-auto max-w-[80%] rounded-lg bg-neutral-100 px-3 py-2 text-sm"
              }
            >
              {m.content}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === "fr" ? "Posez une question…" : "Ask a question…"}
          />
          <Button type="submit">{lang === "fr" ? "Envoyer" : "Send"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
