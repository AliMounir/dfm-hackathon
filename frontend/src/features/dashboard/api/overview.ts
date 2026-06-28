import { apiGet } from "@/features/shared/api/client";

export type OverviewProject = { id: string; name: string; files: number; records: number };
export type Overview = {
  n_projects: number;
  n_files: number;
  n_records: number;
  projects: OverviewProject[];
};

/** Static, deterministic overview across all projects (no agent). */
export async function getOverview(): Promise<Overview | null> {
  try {
    return await apiGet<Overview>("/overview");
  } catch {
    return null;
  }
}
