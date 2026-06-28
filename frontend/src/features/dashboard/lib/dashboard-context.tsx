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
  const [plan, setPlan] = useState<DashboardPlan | null>(null);
  const [state, setState] = useState<State>("idle");

  useEffect(() => {
    if (!projectId) {
      setPlan(null);
      setState("idle");
      return;
    }
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

  const applyOp = useCallback((op: DashboardOp) => {
    setPlan((p) => {
      if (!p) return p;
      if (op.kind === "clear") return { ...p, kpis: [], sections: [] };
      if (op.kind === "add_chart") return { ...p, sections: [...p.sections, op.section] };
      if (op.kind === "add_kpi") return { ...p, kpis: [...p.kpis, op.kpi] };
      if (op.kind === "remove")
        return {
          ...p,
          kpis: p.kpis.filter((k) => k.id !== op.id),
          sections: p.sections.filter((s) => s.id !== op.id),
        };
      return p;
    });
  }, []);

  return (
    <DashboardCtx.Provider value={{ projectId, language, plan, state, applyOp }}>
      {children}
    </DashboardCtx.Provider>
  );
}
