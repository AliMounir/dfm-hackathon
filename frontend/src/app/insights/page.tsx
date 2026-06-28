import Link from "next/link";

import { InsightsPanel } from "@/features/insights/components/insights-panel";
import { projects } from "@/lib/projects";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: pid } = await searchParams;
  const project = projects.find((p) => p.id === pid) ?? projects[0];
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <Link href="/" className="text-sm text-muted hover:underline">
        ← Accueil
      </Link>
      <InsightsPanel project={project} />
    </main>
  );
}
