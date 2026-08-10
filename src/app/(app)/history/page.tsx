import type { Metadata } from "next";
import Link from "next/link";
import { History as HistoryIcon, Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { requireViewContext } from "@/lib/session";
import { listLeagues } from "@/lib/queries/leagues";
import { db } from "@/lib/db";
import { cn, formatPoints, formatRecord } from "@/lib/utils";

export const metadata: Metadata = { title: "History" };

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueSlug } = await searchParams;
  const { actor, viewer } = await requireViewContext();
  const leagues = await listLeagues(actor);

  if (leagues.length === 0) {
    return (
      <PageContainer className="py-10">
        <EmptyState icon={HistoryIcon} title="No leagues yet" />
      </PageContainer>
    );
  }

  const selected = leagues.find((l) => l.slug === leagueSlug) ?? leagues[0];

  const seasons = await db.season.findMany({
    where: { leagueId: selected.id },
    orderBy: { year: "desc" },
    include: {
      champion: {
        select: {
          id: true,
          name: true,
          wins: true,
          losses: true,
          ties: true,
          pointsFor: true,
          memberships: {
            include: { user: { select: { id: true, name: true, image: true } } },
          },
        },
      },
      runnerUp: {
        select: {
          name: true,
          memberships: { include: { user: { select: { name: true } } } },
        },
      },
      _count: { select: { teams: true, matchups: true } },
    },
  });

  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow mb-2">The long view</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">League History</h1>
        <p className="text-muted mt-3 max-w-2xl">
          {selected.name}, season by season, since {selected.foundedYear}.
        </p>
      </header>

      {leagues.length > 1 ? (
        <nav aria-label="League" className="mb-8 flex flex-wrap gap-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/history?league=${league.slug}`}
              aria-current={league.id === selected.id ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                league.id === selected.id
                  ? "border-gold bg-gold text-inverse"
                  : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {league.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <ol className="border-line relative space-y-4 border-l-2 pl-8">
        {seasons.map((season) => {
          const championManager = season.champion?.memberships[0]?.user;
          const isViewer = championManager?.id === viewer.id;
          const inProgress = season.status === "IN_PROGRESS";

          return (
            <li key={season.id} className="relative">
              <span
                className={cn(
                  "ring-bg absolute top-6 -left-[41px] size-4 rounded-full ring-4",
                  inProgress
                    ? "bg-ice"
                    : season.champion
                      ? "bg-gold"
                      : "bg-line-strong",
                )}
              />
              <Link href={`/league/${selected.slug}?season=${season.year}`}>
                <Card
                  variant="raised"
                  className={cn(
                    "p-5 transition-colors hover:border-line-strong",
                    isViewer && "border-gold/50",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="stat-figure text-3xl">{season.year}</p>
                      <p className="text-subtle mt-1 text-xs">
                        {season._count.teams} teams · {season._count.matchups} matchups
                      </p>
                    </div>
                    {inProgress ? (
                      <Badge tone="ice" size="sm">
                        In progress · week {season.currentWeek}
                      </Badge>
                    ) : season.year === selected.foundedYear ? (
                      <Badge tone="violet" size="sm">
                        League founded
                      </Badge>
                    ) : null}
                  </div>

                  {season.champion ? (
                    <div className="border-line mt-4 flex items-center gap-3 border-t pt-4">
                      <Avatar
                        name={championManager?.name ?? season.champion.name}
                        src={championManager?.image}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-bold">
                          <Trophy className="text-gold size-3.5 shrink-0" />
                          {isViewer ? "You" : championManager?.name}
                        </p>
                        <p className="text-subtle truncate text-xs">
                          {season.champion.name} ·{" "}
                          {formatRecord(
                            season.champion.wins,
                            season.champion.losses,
                            season.champion.ties,
                          )}{" "}
                          · {formatPoints(Number(season.champion.pointsFor))} PF
                        </p>
                      </div>
                      {season.runnerUp ? (
                        <p className="text-subtle hidden shrink-0 text-right text-xs sm:block">
                          beat{" "}
                          {season.runnerUp.memberships[0]?.user.name ??
                            season.runnerUp.name}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              </Link>
            </li>
          );
        })}
      </ol>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
