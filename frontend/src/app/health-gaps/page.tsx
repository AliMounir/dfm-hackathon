import Link from "next/link";

import { HealthGapsPanel } from "@/features/health-gaps/components/health-gaps-panel";
import { projects } from "@/lib/projects";

export default async function HealthGapsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: pid } = await searchParams;
  const project = projects.find((p) => p.id === pid) ?? projects[0];
  return (
    <main className="mx-auto w-full max-w-5xl space-y-4 p-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Accueil
      </Link>
      <HealthGapsPanel project={project} />
    </main>
  );
}
