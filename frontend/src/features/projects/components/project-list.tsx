import type { Language } from "@/features/shared/lib/i18n";
import { ProjectCard } from "@/features/projects/components/project-card";
import type { Project } from "@/features/projects/lib/types";

export function ProjectList({ projects, lang = "fr" }: { projects: Project[]; lang?: Language }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((p) => (
        <ProjectCard key={p.id} project={p} lang={lang} />
      ))}
    </div>
  );
}
