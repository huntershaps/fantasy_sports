import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, SectionHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Stat, StatGrid } from "@/components/ui/stat";
import { db } from "@/lib/db";
import { assertLeagueAccess, requireViewContext } from "@/lib/session";
import { cn, formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Matchup" };

const SLOT_ORDER = ["QB", "RB", "WR", "TE", "FLEX", "SUPER_FLEX", "K", "DST", "BENCH", "IR"];

export default async function MatchupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor } = await requireViewContext();

  const matchup = await db.matchup.findUnique({
    where: { id },
    include: {
      season: { select: { year: true, leagueId: true, league: { select: { name: true, slug: true, accentColor: true } } } },
      homeTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          memberships: { include: { user: { select: { id: true, name: true, image: true } } } },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          memberships: { include: { user: { select: { id: true, name: true, image: true } } } },
        },
      },
      players: {
        include: { player: { select: { fullName: true, position: true, nflTeam: true } } },
      },
    },
  });

  if (!matchup) notFound();
  await assertLeagueAccess(actor, matchup.season.leagueId);

  const homeScore = Number(matchup.homeScore);
  const awayScore = Number(matchup.awayScore);
  const homeWon = matchup.winnerTeamId === matchup.homeTeamId;

  const sides = [
    { team: matchup.awayTeam, score: awayScore, isWinner: !homeWon && !matchup.isTie },
    { team: matchup.homeTeam, score: homeScore, isWinner: homeWon },
  ];

  const slotsFor = (teamId: string) =>
    matchup.players
      .filter((p) => p.fantasyTeamId === teamId)
      .sort((a, b) => {
        const order = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
        return order !== 0 ? order : Number(b.points) - Number(a.points);
      });

  const allStarters = matchup.players.filter((p) => p.isStarter);
  const topPerformer = [...allStarters].sort((a, b) => Number(b.points) - Number(a.points))[0];
  const worstPerformer = [...allStarters].sort((a, b) => Number(a.points) - Number(b.points))[0];

  const benchPoints = (teamId: string) =>
    matchup.players
      .filter((p) => p.fantasyTeamId === teamId && !p.isStarter)
      .reduce((sum, p) => sum + Number(p.points), 0);

  return (
    <PageContainer className="py-8 sm:py-10">
      <Link
        href={`/league/${matchup.season.league.slug}?season=${matchup.season.year}`}
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        {matchup.season.league.name} · {matchup.season.year}
      </Link>

      {/* Scoreboard */}
      <Card variant="raised" className="mb-8 overflow-hidden">
        <div className="border-line flex items-center justify-between border-b px-5 py-3">
          <span className="eyebrow">Week {matchup.week}</span>
          {matchup.type !== "REGULAR" ? (
            <Badge tone={matchup.type === "CHAMPIONSHIP" ? "gold" : "neutral"} size="xs">
              {matchup.type.replace(/_/g, " ")}
            </Badge>
          ) : null}
        </div>

        <div className="grid items-center gap-2 p-6 sm:grid-cols-[1fr_auto_1fr] sm:p-8">
          {sides.map((side, index) => (
            <div
              key={side.team.id}
              className={cn(
                "flex items-center gap-4",
                index === 1 && "sm:flex-row-reverse sm:text-right",
              )}
            >
              <Avatar
                name={side.team.name}
                src={side.team.logoUrl}
                size="xl"
                rounded="card"
                className={cn(!side.isWinner && matchup.isComplete && "opacity-60")}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xl font-extrabold sm:text-2xl">
                  {side.team.name}
                </p>
                {side.team.memberships[0] ? (
                  <Link
                    href={`/profile/${side.team.memberships[0].user.id}`}
                    className="text-muted hover:text-ink truncate text-sm"
                  >
                    {side.team.memberships[0].user.name}
                  </Link>
                ) : null}
                <p
                  className={cn(
                    "stat-figure mt-2 text-4xl sm:text-5xl",
                    side.isWinner ? "text-gold" : "text-muted",
                  )}
                >
                  {formatPoints(side.score)}
                </p>
                {matchup.isComplete ? (
                  <Badge
                    tone={side.isWinner ? "field" : matchup.isTie ? "neutral" : "ember"}
                    size="xs"
                    className="mt-2"
                  >
                    {matchup.isTie ? "TIE" : side.isWinner ? "WIN" : "LOSS"}
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}

          <div className="hidden px-6 sm:block">
            <span className="eyebrow">VS</span>
          </div>
        </div>
      </Card>

      {matchup.isComplete ? (
        <>
          <StatGrid columns={4} className="mb-10">
            <Stat
              label="Margin"
              value={formatPoints(Math.abs(homeScore - awayScore))}
              size="sm"
            />
            <Stat
              label="Combined"
              value={formatPoints(homeScore + awayScore)}
              size="sm"
            />
            <Stat
              label="Top performer"
              value={topPerformer ? formatPoints(Number(topPerformer.points)) : "—"}
              sub={topPerformer?.player.fullName}
              size="sm"
              tone="field"
            />
            <Stat
              label="Worst starter"
              value={worstPerformer ? formatPoints(Number(worstPerformer.points)) : "—"}
              sub={worstPerformer?.player.fullName}
              size="sm"
              tone="ember"
            />
          </StatGrid>

          <SectionHeader eyebrow="Box score" title="Lineups" />
          <div className="grid gap-4 lg:grid-cols-2">
            {sides.map((side) => (
              <Card key={side.team.id} variant="flat" className="overflow-hidden">
                <div className="border-line flex items-center justify-between border-b px-4 py-3">
                  <p className="truncate font-bold">{side.team.name}</p>
                  <p className="text-subtle text-xs">
                    Bench: {formatPoints(benchPoints(side.team.id))}
                  </p>
                </div>
                <ul className="divide-line divide-y">
                  {slotsFor(side.team.id).map((slot) => (
                    <li
                      key={slot.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5",
                        !slot.isStarter && "bg-surface-2/50",
                      )}
                    >
                      <span
                        className={cn(
                          "w-12 shrink-0 text-[11px] font-bold tracking-wide",
                          slot.isStarter ? "text-gold" : "text-subtle",
                        )}
                      >
                        {slot.slot}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {slot.player.fullName}
                        </p>
                        <p className="text-subtle text-xs">
                          {slot.player.position}
                          {slot.player.nflTeam ? ` · ${slot.player.nflTeam}` : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 text-sm font-semibold tabular",
                          slot.isStarter ? "text-ink" : "text-subtle",
                        )}
                      >
                        {formatPoints(Number(slot.points))}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card variant="flat" className="p-8 text-center">
          <p className="text-muted">
            This matchup has not been played yet.
          </p>
        </Card>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
