import { apiGet } from "@/features/shared/api/client";
import { projects as mockProjects, type Project } from "@/lib/projects";

export type ProjectSummary = Pick<Project, "id" | "name" | "folder" | "focus" | "status" | "accent">;

/** List projects. Falls back to bundled mock data until the backend is wired. */
export async function listProjects(): Promise<ProjectSummary[]> {
  try {
    return await apiGet<ProjectSummary[]>("/projects");
  } catch {
    return mockProjects.map((p) => ({
      id: p.id,
      name: p.name,
      folder: p.folder,
      focus: p.focus,
      status: p.status,
      accent: p.accent,
    }));
  }
}

/** Get one project by id (mock fallback). */
export async function getProject(id: string): Promise<Project | undefined> {
  return mockProjects.find((p) => p.id === id);
}
