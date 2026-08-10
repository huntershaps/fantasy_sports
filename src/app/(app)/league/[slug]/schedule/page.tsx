import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Segmented } from "@/components/ui/segmented";
import { SectionHeader } from "@/components/ui/card";
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

  // Which of the viewer's teams plays in this season, for highlighting.
  const myTeam = await db.fantasyTeam.findFirst({
    where: { seasonId: season.id, memberships: { some: { userId: viewer.id } } },
    select: { id: true },
  });

  return (
    <PageContainer className="py-8 sm:py-10">
      <Link
        href={`/league/${league.slug}?season=${season.year}`}
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        {league.name}
      </Link>

      <header className="mb-6">
        <p className="eyebrow mb-2">{league.name}</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">
          {season.year} Schedule
        </h1>
      </header>

      <div className="mb-4">
        <p className="eyebrow mb-2">Season</p>
        <Segmented
          active={String(season.year)}
          items={league.seasons.map((s) => ({
            value: String(s.year),
            label: String(s.year),
            href: `/league/${league.slug}/schedule?season=${s.year}`,
          }))}
        />
      </div>

      <div className="mb-8">
        <p className="eyebrow mb-2">Week</p>
        <Segmented
          size="sm"
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
        <EmptyState title="No schedule yet" description="This season has no matchups recorded." />
      ) : (
        <div className="space-y-10">
          {visibleWeeks.map((week) => {
            const games = matchups.filter((m) => m.week === week);
            const played = games.filter((g) => g.isComplete).length;
            return (
              <section key={week}>
                <SectionHeader
                  eyebrow={played === games.length ? "Final" : played > 0 ? "In progress" : "Upcoming"}
                  title={`Week ${week}`}
                />
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {games.map((matchup) => (
                    <MatchupCard
                      key={matchup.id}
                      matchup={matchup}
                      highlightTeamId={myTeam?.id}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
