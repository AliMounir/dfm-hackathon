"use client";

import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardPlan } from "@/features/dashboard/api/dashboard";
import { DynamicDashboard } from "@/features/dashboard/components/dynamic-dashboard";
import type { DashboardPlan } from "@/features/dashboard/lib/types";
import type { Language } from "@/features/shared/lib/i18n";

/**
 * Fetches the agent-composed dashboard for a project (from the FastAPI backend)
 * and renders it. Drop this into any project view to show what the agent decided.
 */
export function AgentDashboardSection({
  projectId,
  language = "fr",
}: {
  projectId: string;
  language?: Language;
}) {
  const [plan, setPlan] = useState<DashboardPlan | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    setState("loading");
    setPlan(null);
    getDashboardPlan(projectId).then((p) => {
      if (!alive) return;
      if (p) {
        setPlan(p);
        setState("ok");
      } else {
        setState("error");
      }
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  return (
    <Card className="border-emerald-300 bg-emerald-50/40">
      <CardHeader>
        <CardTitle className="text-base">🤖 Tableau de bord généré par l&apos;agent IA</CardTitle>
        <CardDescription>
          {language === "fr"
            ? "L'agent a lu les données du projet et choisi quoi afficher."
            : "The agent read the project's data and chose what to display."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {state === "loading" && (
          <p className="text-sm text-neutral-500">
            {language === "fr" ? "L'agent compose le tableau de bord…" : "The agent is composing the dashboard…"}
          </p>
        )}
        {state === "error" && (
          <p className="text-sm text-neutral-500">
            {language === "fr" ? "Backend non disponible — démarrez-le : " : "Backend not reachable — start it: "}
            <code className="rounded bg-neutral-100 px-1">uvicorn app.main:app --port 8000</code>
          </p>
        )}
        {state === "ok" && plan && <DynamicDashboard plan={plan} lang={language} />}
      </CardContent>
    </Card>
  );
}
