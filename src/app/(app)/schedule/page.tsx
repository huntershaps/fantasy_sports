import { redirect } from "next/navigation";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewContext } from "@/lib/session";
import { listLeagues } from "@/lib/queries/leagues";

/** Top-level Schedule has no league of its own, so it forwards to the current
 *  season of the first league the viewer belongs to. */
export default async function ScheduleRedirect() {
  const { actor } = await requireViewContext();
  const leagues = await listLeagues(actor);

  if (leagues.length > 0) {
    const league = leagues[0];
    redirect(
      league.currentSeasonYear
        ? `/league/${league.slug}/schedule?season=${league.currentSeasonYear}`
        : `/league/${league.slug}/schedule`,
    );
  }

  return (
    <PageContainer className="py-6">
      <PageHeader label="Schedule" title="Schedule" />
      <EmptyState
        title="No leagues yet"
        description="Join or import a league to see its schedule."
      />
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
