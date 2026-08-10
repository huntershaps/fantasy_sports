import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CalendarDays, Medal, Shield, Trophy, Users } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { StandingsTable } from "@/components/league/standings-table";
import { MatchupCard } from "@/components/cards/matchup-card";
import { MemoryCard } from "@/components/cards/memory-card";
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
  const season =
    league.seasons.find((s) => s.year === selectedYear) ?? league.seasons[0];
  if (!season) notFound();

  const [standings, matchups, records, memories, championRow] = await Promise.all([
    getSeasonStandings(season.id),
    getSeasonMatchups(season.id),
    getLeagueRecords(league.id),
    listMemories(actor, viewer.id, { leagueId: league.id, take: 6 }),
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
  ]);

  const completedWeeks = [...new Set(matchups.filter((m) => m.isComplete).map((m) => m.week))];
  const latestWeek = completedWeeks.at(-1);
  const recentResults = matchups.filter((m) => m.week === latestWeek && m.isComplete);
  const upcoming = matchups.filter((m) => !m.isComplete).slice(0, 4);

  const totalMatchups = await db.matchup.count({
    where: { season: { leagueId: league.id }, isComplete: true },
  });

  return (
    <div style={{ ["--c-accent" as string]: league.accentColor, ["--c-accent-2" as string]: league.secondColor }}>
      {/* Hero */}
      <div className="border-line relative overflow-hidden border-b">
        <div aria-hidden className="field-lines absolute inset-0 opacity-50" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(80% 120% at 10% 0%, var(--c-accent), transparent 55%), radial-gradient(60% 100% at 95% 10%, var(--c-accent-2), transparent 60%)",
          }}
        />
        <PageContainer className="relative py-10 sm:py-14">
          <div className="flex flex-wrap items-start gap-5">
            <span
              className="grid size-16 shrink-0 place-items-center rounded-3xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--c-accent) 20%, transparent)" }}
            >
              <Shield className="size-8" style={{ color: "var(--c-accent)" }} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow mb-2">Est. {league.foundedYear}</p>
              <h1 className="text-4xl leading-[0.95] font-extrabold text-balance sm:text-6xl">
                {league.name}
              </h1>
              {league.tagline ? (
                <p className="text-muted mt-3 max-w-2xl text-lg">{league.tagline}</p>
              ) : null}
            </div>
          </div>

          <dl className="mt-9 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <HeroStat label="Managers" value={String(league._count.memberships)} icon={Users} />
            <HeroStat label="Seasons" value={String(league.seasons.length)} icon={CalendarDays} />
            <HeroStat label="Matchups played" value={totalMatchups.toLocaleString()} icon={Medal} />
            <HeroStat
              label={`${season.year} champion`}
              value={
                championRow?.champion?.memberships[0]?.user.name ??
                championRow?.champion?.name ??
                "TBD"
              }
              icon={Trophy}
              small
            />
          </dl>

          <div className="mt-8">
            <p className="eyebrow mb-2">Season</p>
            <Segmented
              active={String(season.year)}
              items={league.seasons.map((s) => ({
                value: String(s.year),
                label: String(s.year),
                href: `/league/${league.slug}?season=${s.year}`,
              }))}
              className="max-w-full"
            />
          </div>
        </PageContainer>
      </div>

      <PageContainer className="space-y-12 py-8 sm:py-10">
        <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-10">
            <section>
              <SectionHeader
                eyebrow={`${season.year} standings`}
                title="Where everyone finished"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/league/${league.slug}/schedule?season=${season.year}`}>
                      Full schedule <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <StandingsTable
                rows={standings}
                playoffCutoff={league.settings?.playoffTeamCount ?? 6}
                highlightUserId={viewer.id}
                championTeamId={championRow?.championTeamId}
              />
            </section>

            {recentResults.length > 0 ? (
              <section>
                <SectionHeader eyebrow={`Week ${latestWeek}`} title="Recent results" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {recentResults.map((m) => (
                    <MatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </section>
            ) : null}

            {upcoming.length > 0 ? (
              <section>
                <SectionHeader eyebrow="Next up" title="Upcoming matchups" />
                <div className="grid gap-3 sm:grid-cols-2">
                  {upcoming.map((m) => (
                    <MatchupCard key={m.id} matchup={m} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-8">
            <section>
              <SectionHeader
                eyebrow="All time"
                title="League records"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/records?league=${league.slug}`}>All</Link>
                  </Button>
                }
              />
              {records.length > 0 ? (
                <Card variant="flat" className="divide-line divide-y">
                  {records.slice(0, 6).map((record) => (
                    <div key={record.id} className="flex items-baseline gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{record.label}</p>
                        <p className="text-subtle mt-0.5 truncate text-xs">
                          {record.holderTeam?.name ??
                            record.holderPlayer?.fullName ??
                            record.holderUser?.name}
                          {record.year ? ` · ${record.year}` : ""}
                        </p>
                      </div>
                      <span className="stat-figure text-gold shrink-0 text-lg">
                        {record.displayValue}
                      </span>
                    </div>
                  ))}
                </Card>
              ) : (
                <EmptyState title="No records yet" />
              )}
            </section>

            <section>
              <SectionHeader
                eyebrow="Did you know"
                title="From the archive"
                action={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/memories">All</Link>
                  </Button>
                }
              />
              <div className="space-y-3">
                {memories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            </section>
          </aside>
        </div>
      </PageContainer>
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
  small,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  small?: boolean;
}) {
  return (
    <div>
      <dt className="eyebrow mb-1.5 flex items-center gap-1.5">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className={small ? "truncate text-lg font-bold" : "stat-figure text-3xl"}>
        {value}
      </dd>
    </div>
  );
}

export const dynamic = "force-dynamic";
