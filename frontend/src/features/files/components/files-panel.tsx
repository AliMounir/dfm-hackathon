"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Language } from "@/features/shared/lib/i18n";
import type { Project } from "@/features/files/lib/types";

/**
 * Data-export uploads (REDCap, DHIS2, Excel, CSV, PDF) for a project — the raw
 * inputs the three functions analyse. TODO(DfM): wire upload to /api/files.
 */
export function FilesPanel({ project, lang = "fr" }: { project: Project; lang?: Language }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {lang === "fr" ? "Données du projet" : "Project data"} · {project.name}
        </CardTitle>
        <CardDescription>
          {lang === "fr"
            ? "Exports REDCap, DHIS2, Excel, CSV — sources d'analyse."
            : "REDCap, DHIS2, Excel, CSV exports — analysis sources."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {project.dataSources.map((s) => (
            <Badge key={s} className="bg-mist text-muted">
              {s}
            </Badge>
          ))}
        </div>
        <div className="border border-dashed border-line p-6 text-center text-sm text-muted">
          {lang === "fr"
            ? "TODO(DfM) : déposer un export ici pour l'analyser."
            : "TODO(DfM): drop a data export here to analyse it."}
          <div className="mt-3">
            <Button disabled>{lang === "fr" ? "Importer (à venir)" : "Upload (coming soon)"}</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
