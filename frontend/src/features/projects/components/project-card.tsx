import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import { t } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/projects/lib/types";

export function ProjectCard({ project, lang = "fr" }: { project: Project; lang?: Language }) {
  return (
    <Link href={`/projects/${project.id}`} className="block">
      <Card className="h-full transition hover:shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            {project.name}
            <Badge>{t(project.status, lang)}</Badge>
          </CardTitle>
          <CardDescription>{t(project.focus, lang)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-1.5">
          {project.dataSources.map((s) => (
            <Badge key={s} className="bg-neutral-100 text-neutral-700">
              {s}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </Link>
  );
}
