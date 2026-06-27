import Link from "next/link";

import { FilesPanel } from "@/features/files/components/files-panel";
import { projects } from "@/lib/projects";

export default async function FilesPage({
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
      <FilesPanel project={project} />
    </main>
  );
}
