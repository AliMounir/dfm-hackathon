"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getDashboardPlan } from "@/features/dashboard/api/dashboard";
import type { DashboardOp } from "@/features/dashboard/api/chat";
import type { DashboardPlan } from "@/features/dashboard/lib/types";
import type { Language } from "@/features/shared/lib/i18n";

type State = "idle" | "loading" | "ok" | "error";

type Ctx = {
  projectId: string | null;
  language: Language;
  plan: DashboardPlan | null;
  state: State;
  applyOp: (op: DashboardOp) => void;
};

const DashboardCtx = createContext<Ctx | null>(null);

export function useDashboard(): Ctx {
  const c = useContext(DashboardCtx);
  if (!c) throw new Error("useDashboard must be used inside <DashboardProvider>");
  return c;
}

export function DashboardProvider({
  projectId,
  language,
  children,
}: {
  projectId: string | null;
  language: Language;
  children: React.ReactNode;
}) {
  const [load, setLoad] = useState<{
    projectId: string | null;
    plan: DashboardPlan | null;
    state: State;
  }>({ projectId: null, plan: null, state: "idle" });

  useEffect(() => {
    if (!projectId) return;

    let alive = true;
    getDashboardPlan(projectId).then((p) => {
      if (!alive) return;
      setLoad({ projectId, plan: p, state: p ? "ok" : "error" });
    });
    return () => {
      alive = false;
    };
  }, [projectId]);

  const plan = load.projectId === projectId ? load.plan : null;
  const state: State = !projectId
    ? "idle"
    : load.projectId === projectId
      ? load.state
      : "loading";

  const applyOp = useCallback((op: DashboardOp) => {
    setLoad((current) => {
      if (!current.plan) return current;
      const plan = current.plan;
      if (op.kind === "clear") return { ...current, plan: { ...plan, kpis: [], sections: [] } };
      if (op.kind === "add_chart")
        return { ...current, plan: { ...plan, sections: [...plan.sections, op.section] } };
      if (op.kind === "add_kpi")
        return { ...current, plan: { ...plan, kpis: [...plan.kpis, op.kpi] } };
      if (op.kind === "remove")
        return {
          ...current,
          plan: {
            ...plan,
            kpis: plan.kpis.filter((k) => k.id !== op.id),
            sections: plan.sections.filter((s) => s.id !== op.id),
          },
        };
      return current;
    });
  }, []);

  return (
    <DashboardCtx.Provider value={{ projectId, language, plan, state, applyOp }}>
      {children}
    </DashboardCtx.Provider>
  );
}
