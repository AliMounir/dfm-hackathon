import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardPlan } from "@/features/dashboard/api/dashboard";
import { DynamicDashboard } from "@/features/dashboard/components/dynamic-dashboard";
import { projects } from "@/lib/projects";

const FUNCTIONS = [
  { href: "data-quality", fr: "Contrôle qualité", en: "Data quality" },
  { href: "health-gaps", fr: "Lacunes & risques", en: "Healthcare gaps" },
  { href: "insights", fr: "Analyses & récits", en: "Insights & stories" },
  { href: "chat", fr: "Assistant", en: "Assistant" },
  { href: "files", fr: "Données", en: "Data" },
];

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = projects.find((p) => p.id === id);
  if (!project) notFound();

  // Agent-composed dashboard (falls back to a rule-based plan, or null if the
  // backend isn't running).
  const plan = await getDashboardPlan(id);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Accueil
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{project.name}</h1>
        <p className="text-neutral-500">{project.focus.fr}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FUNCTIONS.map((f) => (
          <Link key={f.href} href={`/${f.href}?project=${project.id}`}>
            <Card className="h-full transition hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-sm">{f.fr}</CardTitle>
                <CardDescription className="text-xs">{f.en}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {plan ? (
        <DynamicDashboard plan={plan} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tableau de bord dynamique</CardTitle>
            <CardDescription>
              Démarrez le backend (uvicorn) pour générer le tableau de bord via l&apos;agent.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </main>
  );
}
