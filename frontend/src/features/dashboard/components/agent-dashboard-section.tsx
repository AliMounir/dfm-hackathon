"use client";

import { DynamicDashboard } from "@/features/dashboard/components/dynamic-dashboard";
import { useDashboard } from "@/features/dashboard/lib/dashboard-context";

/** The dashboard view (chat lives in the collapsible sidebar). Reads the shared
 *  plan from context so the sidebar chat can edit it live. */
export function AgentDashboardSection() {
  const { plan, state, language } = useDashboard();

  if (state === "loading")
    return (
      <p className="text-sm text-stone-500">
        {language === "fr" ? "L'agent compose le tableau de bord…" : "The agent is composing the dashboard…"}
      </p>
    );
  if (state === "error" || !plan)
    return (
      <p className="text-sm text-stone-500">
        {language === "fr" ? "Tableau de bord temporairement indisponible." : "Dashboard temporarily unavailable."}
      </p>
    );

  return <DynamicDashboard plan={plan} lang={language} />;
}
