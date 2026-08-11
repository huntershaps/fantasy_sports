import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/app-shell";
import { LeagueHeader } from "@/components/league/league-header";
import { Chips } from "@/components/ui/segmented";
import { Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchupCard } from "@/components/cards/matchup-card";
import { requireViewContext } from "@/lib/session";
import { getLeagueBySlug, getSeasonMatchups } from "@/lib/queries/leagues";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string; week?: string }>;
};

export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam, week: weekParam } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const league = await getLeagueBySlug(actor, slug);
  if (!league) notFound();

  const selectedYear = seasonParam ? Number(seasonParam) : league.seasons[0]?.year;
  const season = league.seasons.find((s) => s.year === selectedYear) ?? league.seasons[0];
  if (!season) notFound();

  const matchups = await getSeasonMatchups(season.id);
  const weeks = [...new Set(matchups.map((m) => m.week))].sort((a, b) => a - b);
  const selectedWeek = weekParam ? Number(weekParam) : null;
  const visibleWeeks = selectedWeek ? weeks.filter((w) => w === selectedWeek) : weeks;

  const myTeam = await db.fantasyTeam.findFirst({
    where: { seasonId: season.id, memberships: { some: { userId: viewer.id } } },
    select: { id: true },
  });

  return (
    <div style={{ ["--c-league" as string]: league.accentColor }}>
      <LeagueHeader
        slug={league.slug}
        name={league.name}
        tagline={league.tagline}
        accentColor={league.accentColor}
        foundedYear={league.foundedYear}
        seasonCount={league.seasons.length}
        managerCount={league._count.memberships}
        currentTab="schedule"
        seasons={league.seasons}
        activeYear={season.year}
      />

      <PageContainer width="wide" className="py-6">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="label">Week</span>
          <Chips
            active={selectedWeek ? String(selectedWeek) : "all"}
            items={[
              {
                value: "all",
                label: "All",
                href: `/league/${league.slug}/schedule?season=${season.year}`,
              },
              ...weeks.map((week) => ({
                value: String(week),
                label: String(week),
                href: `/league/${league.slug}/schedule?season=${season.year}&week=${week}`,
              })),
            ]}
          />
        </div>

        {matchups.length === 0 ? (
          <EmptyState
            title="No schedule yet"
            description="This season has no matchups recorded."
          />
        ) : (
          <div className="space-y-8">
            {visibleWeeks.map((week) => {
              const games = matchups.filter((m) => m.week === week);
              const played = games.filter((g) => g.isComplete).length;
              return (
                <Section key={week}>
                  <SectionHeader
                    label={`Week ${week}`}
                    action={
                      <span className="text-faint text-xs">
                        {played === games.length
                          ? "Final"
                          : played > 0
                            ? `${played} of ${games.length} played`
                            : "Not played"}
                      </span>
                    }
                  />
                  <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                    {games.map((matchup) => (
                      <MatchupCard
                        key={matchup.id}
                        matchup={matchup}
                        highlightTeamId={myTeam?.id}
                      />
                    ))}
                  </div>
                </Section>
              );
            })}
          </div>
        )}
      </PageContainer>
    </div>
  );
}

export const dynamic = "force-dynamic";
