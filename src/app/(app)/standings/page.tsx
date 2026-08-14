import { redirect } from "next/navigation";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewContext } from "@/lib/session";
import { listLeagues } from "@/lib/queries/leagues";

/** As with Schedule: forwards to the viewer's first league. */
export default async function StandingsRedirect() {
  const { actor } = await requireViewContext();
  const leagues = await listLeagues(actor);

  if (leagues.length > 0) {
    const league = leagues[0];
    redirect(
      league.currentSeasonYear
        ? `/league/${league.slug}/standings?season=${league.currentSeasonYear}`
        : `/league/${league.slug}/standings`,
    );
  }

  return (
    <PageContainer className="py-6">
      <PageHeader label="Standings" title="Standings" />
      <EmptyState
        title="No leagues yet"
        description="Join or import a league to see its standings."
      />
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
