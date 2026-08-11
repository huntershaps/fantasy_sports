import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/app-shell";
import { Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueHeader } from "@/components/league/league-header";
import { StandingsTable } from "@/components/league/standings-table";
import { MatchupCard } from "@/components/cards/matchup-card";
import { MemoryEntry, FeaturedMemory } from "@/components/cards/memory-card";
import { requireViewContext } from "@/lib/session";
import {
  getLeagueBySlug,
  getLeagueRecords,
  getSeasonMatchups,
  getSeasonStandings,
} from "@/lib/queries/leagues";
import { listMemories } from "@/lib/queries/memories";
import { db } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { actor } = await requireViewContext();
  const league = await getLeagueBySlug(actor, slug);
  return { title: league?.name ?? "League" };
}

export default async function LeaguePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const league = await getLeagueBySlug(actor, slug);
  if (!league) notFound();

  const selectedYear = seasonParam ? Number(seasonParam) : league.seasons[0]?.year;
  const season = league.seasons.find((s) => s.year === selectedYear) ?? league.seasons[0];
  if (!season) notFound();

  const [standings, matchups, records, memories, seasonRow, totalMatchups] =
    await Promise.all([
      getSeasonStandings(season.id),
      getSeasonMatchups(season.id),
      getLeagueRecords(league.id),
      listMemories(actor, viewer.id, { leagueId: league.id, take: 9 }),
      db.season.findUnique({
        where: { id: season.id },
        select: {
          championTeamId: true,
          currentWeek: true,
          champion: {
            select: {
              name: true,
              memberships: { include: { user: { select: { name: true } } } },
            },
          },
        },
      }),
      db.matchup.count({ where: { season: { leagueId: league.id }, isComplete: true } }),
    ]);

  const completedWeeks = [...new Set(matchups.filter((m) => m.isComplete).map((m) => m.week))];
  const latestWeek = completedWeeks.at(-1);
  const recentResults = matchups.filter((m) => m.week === latestWeek && m.isComplete);
  const upcoming = matchups.filter((m) => !m.isComplete).slice(0, 4);

  const champion = seasonRow?.champion;
  const championLine = champion
    ? `${champion.memberships[0]?.user.name ?? champion.name}`
    : null;

  const featured = memories[0] ?? null;
  const rest = memories.slice(1, 6);

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
        currentTab="overview"
        seasons={league.seasons}
        activeYear={season.year}
        championLine={championLine}
      />

      <PageContainer width="wide" className="py-6">
        <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-7 xl:col-span-8">
            <Section>
              <SectionHeader
                label={`${season.year} standings`}
                rule={false}
                action={
                  <Link
                    href={`/league/${league.slug}/schedule?season=${season.year}`}
                    className="text-muted hover:text-ink text-xs"
                  >
                    Full schedule
                  </Link>
                }
              />
              <StandingsTable
                rows={standings}
                playoffCutoff={league.settings?.playoffTeamCount ?? 6}
                highlightUserId={viewer.id}
                championTeamId={seasonRow?.championTeamId}
              />
            </Section>

            {recentResults.length > 0 ? (
              <Section className="mt-8">
                <SectionHeader label={`Week ${latestWeek}`} title="Latest results" />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {recentResults.map((m) => (
                    <MatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </Section>
            ) : null}

            {upcoming.length > 0 ? (
              <Section className="mt-8">
                <SectionHeader label="Next up" title="Upcoming" />
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {upcoming.map((m) => (
                    <MatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </Section>
            ) : null}
          </div>

          <aside className="lg:col-span-5 xl:col-span-4">
            <p className="text-muted border-line border-t pt-4 text-sm">
              <span className="text-ink tnum font-semibold">
                {totalMatchups.toLocaleString()}
              </span>{" "}
              matchups played in this league since {league.foundedYear}.
            </p>

            {featured ? (
              <Section className="mt-7">
                <FeaturedMemory memory={featured} label="From the archives" />
              </Section>
            ) : null}

            {rest.length > 0 ? (
              <Section className="mt-6">
                <div className="border-line border-t">
                  {rest.map((memory) => (
                    <MemoryEntry key={memory.id} memory={memory} />
                  ))}
                </div>
                <Link
                  href={`/memories?league=${league.slug}`}
                  className="text-muted hover:text-ink mt-3 inline-block text-xs"
                >
                  All memories
                </Link>
              </Section>
            ) : null}

            <Section className="mt-8">
              <SectionHeader
                label="All time"
                title="Records"
                action={
                  <Link
                    href={`/records?league=${league.slug}`}
                    className="text-muted hover:text-ink text-xs"
                  >
                    All
                  </Link>
                }
              />
              {records.length > 0 ? (
                <dl className="border-line divide-line divide-y border-t">
                  {records.slice(0, 7).map((record) => (
                    <div
                      key={record.id}
                      className="flex items-baseline justify-between gap-4 py-2.5"
                    >
                      <div className="min-w-0">
                        <dt className="text-ink text-sm">{record.label}</dt>
                        <dd className="text-faint truncate text-xs">
                          {record.holderTeam?.name ??
                            record.holderPlayer?.fullName ??
                            record.holderUser?.name}
                          {record.year ? ` · ${record.year}` : ""}
                        </dd>
                      </div>
                      <span className="figure-num tnum text-brand shrink-0 text-base">
                        {record.displayValue}
                      </span>
                    </div>
                  ))}
                </dl>
              ) : (
                <EmptyState title="No records yet" compact />
              )}
            </Section>
          </aside>
        </div>
      </PageContainer>
    </div>
  );
}

export const dynamic = "force-dynamic";
