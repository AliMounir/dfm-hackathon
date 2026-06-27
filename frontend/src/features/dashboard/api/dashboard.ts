import { apiGet } from "@/features/shared/api/client";

import type { DashboardPlan } from "@/features/dashboard/lib/types";

/**
 * Fetch the agent-composed dashboard plan for a project.
 * Returns null if the backend isn't reachable (frontend can fall back to a
 * static layout in that case).
 */
export async function getDashboardPlan(projectId: string): Promise<DashboardPlan | null> {
  try {
    return await apiGet<DashboardPlan>(`/projects/${projectId}/dashboard`);
  } catch {
    return null;
  }
}
