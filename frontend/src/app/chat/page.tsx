import Link from "next/link";

import { ChatPanel } from "@/features/chat/components/chat-panel";
import { projects } from "@/lib/projects";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const { project: pid } = await searchParams;
  const project = projects.find((p) => p.id === pid) ?? projects[0];
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Accueil
      </Link>
      <div className="min-h-[60vh]">
        <ChatPanel project={project} />
      </div>
    </main>
  );
}
