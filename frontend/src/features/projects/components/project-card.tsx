import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Duotone } from "@/components/ui/duotone";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/projects/lib/types";

export function ProjectCard({ project, lang = "fr" }: { project: Project; lang?: Language }) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="h-full overflow-hidden transition-colors hover:border-azure">
        <Duotone
          src="/photos/region.jpg"
          alt={`${project.name} region`}
          className="h-24 w-full"
        />
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            {project.name}
            <Badge>{t(project.status, lang)}</Badge>
          </CardTitle>
          <CardDescription>{t(project.focus, lang)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {project.dataSources.map((s) => (
            <Badge key={s} className="bg-mist text-muted">
              {s}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}
