import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
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
      <PageContainer className="py-6">
        <EmptyState title="No leagues yet" />
      </PageContainer>
    );
  }

  const selected = leagues.find((l) => l.slug === leagueSlug) ?? leagues[0];

  const [seasons, records] = await Promise.all([
    db.season.findMany({
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
            memberships: { include: { user: { select: { id: true, name: true } } } },
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
    }),
    // Records that were set in a given season become timeline annotations.
    db.leagueRecord.findMany({
      where: { leagueId: selected.id, isCurrent: true, seasonId: { not: null } },
      select: { id: true, label: true, displayValue: true, seasonId: true },
    }),
  ]);

  const recordsBySeason = new Map<string, typeof records>();
  for (const record of records) {
    if (!record.seasonId) continue;
    const list = recordsBySeason.get(record.seasonId) ?? [];
    list.push(record);
    recordsBySeason.set(record.seasonId, list);
  }

  return (
    <PageContainer className="py-6">
      <PageHeader
        label="The long view"
        title={`${selected.name} history`}
        description={`Season by season since ${selected.foundedYear}.`}
      />

      {leagues.length > 1 ? (
        <nav aria-label="League" className="mb-8 flex flex-wrap gap-1">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/history?league=${league.slug}`}
              aria-current={league.id === selected.id ? "true" : undefined}
              className={cn(
                "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                league.id === selected.id
                  ? "bg-surface-3 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {league.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {/* The spine runs the full column; each year hangs off it. */}
      <ol className="border-line relative border-l pl-6 sm:pl-8">
        {seasons.map((season) => {
          const manager = season.champion?.memberships[0]?.user;
          const isViewer = manager?.id === viewer.id;
          const inProgress = season.status === "IN_PROGRESS";
          const seasonRecords = recordsBySeason.get(season.id) ?? [];

          return (
            <li key={season.id} className="relative pb-8 last:pb-0">
              <span
                aria-hidden
                className={cn(
                  "ring-base absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 sm:-left-[33px]",
                  inProgress
                    ? "bg-info"
                    : season.champion
                      ? "bg-brand"
                      : "bg-line-strong",
                )}
              />

              <div className="flex flex-wrap items-baseline gap-x-3">
                <Link
                  href={`/league/${selected.slug}?season=${season.year}`}
                  className="figure-num hover:text-brand text-xl transition-colors"
                >
                  {season.year}
                </Link>
                {inProgress ? (
                  <span className="text-info text-xs">
                    In progress · week {season.currentWeek}
                  </span>
                ) : season.year === selected.foundedYear ? (
                  <span className="text-muted text-xs">League founded</span>
                ) : null}
                <span className="text-faint ml-auto text-xs">
                  {season._count.teams} teams · {season._count.matchups} matchups
                </span>
              </div>

              {season.champion ? (
                <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-md">
                  <Trophy className="text-brand size-3.5 shrink-0 self-center" />
                  <span className="text-ink font-medium">
                    {isViewer ? "You" : manager?.name}
                  </span>
                  <span className="text-muted">
                    won with {season.champion.name}
                  </span>
                  <span className="text-faint tnum text-xs">
                    {formatRecord(
                      season.champion.wins,
                      season.champion.losses,
                      season.champion.ties,
                    )}{" "}
                    · {formatPoints(Number(season.champion.pointsFor))} PF
                  </span>
                </p>
              ) : null}

              {season.runnerUp ? (
                <p className="text-faint mt-1 text-xs">
                  Runner-up:{" "}
                  {season.runnerUp.memberships[0]?.user.name ?? season.runnerUp.name}
                </p>
              ) : null}

              {seasonRecords.length > 0 ? (
                <ul className="mt-2.5 space-y-1">
                  {seasonRecords.map((record) => (
                    <li key={record.id} className="text-muted text-xs">
                      <span className="text-brand tnum font-medium">
                        {record.displayValue}
                      </span>{" "}
                      — {record.label} set this season
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ol>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
