import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Section, SectionHeader } from "@/components/ui/layout";
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
      season: {
        select: {
          year: true,
          leagueId: true,
          league: { select: { name: true, slug: true, accentColor: true } },
        },
      },
      homeTeam: {
        select: {
          id: true,
          name: true,
          wins: true,
          losses: true,
          memberships: { include: { user: { select: { id: true, name: true } } } },
        },
      },
      awayTeam: {
        select: {
          id: true,
          name: true,
          wins: true,
          losses: true,
          memberships: { include: { user: { select: { id: true, name: true } } } },
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

  const starters = matchup.players.filter((p) => p.isStarter);
  const top = [...starters].sort((a, b) => Number(b.points) - Number(a.points))[0];
  const bottom = [...starters].sort((a, b) => Number(a.points) - Number(b.points))[0];

  const benchPoints = (teamId: string) =>
    matchup.players
      .filter((p) => p.fantasyTeamId === teamId && !p.isStarter)
      .reduce((sum, p) => sum + Number(p.points), 0);

  const roundLabel =
    matchup.type === "REGULAR" ? null : matchup.type.replace(/_/g, " ").toLowerCase();

  return (
    <PageContainer className="py-6">
      <Link
        href={`/league/${matchup.season.league.slug}?season=${matchup.season.year}`}
        className="text-muted hover:text-ink mb-5 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="size-3.5" />
        {matchup.season.league.name} · {matchup.season.year}
      </Link>

      {/* Scoreline. The winner is carried by weight and a rule, not a badge. */}
      <div className="border-line border-y py-5">
        <div className="text-faint mb-4 flex items-baseline gap-2 text-xs">
          <span className="label">Week {matchup.week}</span>
          {roundLabel ? (
            <span className="text-brand capitalize">{roundLabel}</span>
          ) : null}
          {!matchup.isComplete ? <span>· Not yet played</span> : null}
        </div>

        <div className="space-y-3">
          {sides.map((side) => (
            <div key={side.team.id} className="flex items-center gap-4">
              <span
                aria-hidden
                className={cn(
                  "h-8 w-1 shrink-0 rounded-full",
                  matchup.isComplete && side.isWinner ? "bg-brand" : "bg-line",
                )}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-lg font-semibold",
                    matchup.isComplete && !side.isWinner && "text-muted",
                  )}
                >
                  {side.team.name}
                </p>
                {side.team.memberships[0] ? (
                  <Link
                    href={`/profile/${side.team.memberships[0].user.id}`}
                    className="text-faint hover:text-muted text-xs"
                  >
                    {side.team.memberships[0].user.name}
                  </Link>
                ) : null}
              </div>
              <span
                className={cn(
                  "figure-num tnum shrink-0 text-3xl",
                  matchup.isComplete && side.isWinner ? "text-ink" : "text-muted",
                )}
              >
                {matchup.isComplete ? formatPoints(side.score) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Margin and combined only mean something once the game is final. */}
      {matchup.isComplete ? (
          <dl className="border-line grid grid-cols-2 gap-x-8 gap-y-4 border-b py-4 sm:grid-cols-4">
            <Figure label="Margin" value={formatPoints(Math.abs(homeScore - awayScore))} />
            <Figure label="Combined" value={formatPoints(homeScore + awayScore)} />
            <Figure
              label="Top starter"
              value={top ? formatPoints(Number(top.points)) : "—"}
              sub={top?.player.fullName}
            />
            <Figure
              label="Worst starter"
              value={bottom ? formatPoints(Number(bottom.points)) : "—"}
              sub={bottom?.player.fullName}
            />
          </dl>
      ) : null}

      {/* Rosters are shown whenever they exist. Gating this on `isComplete`
          hid the lineups for games already in progress, which is exactly when
          you most want to look at them. */}
      {matchup.players.length > 0 ? (
          <Section className="mt-8">
            <SectionHeader label={matchup.isComplete ? "Box score" : "Lineups"} rule={false} />
            <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
              {sides.map((side) => (
                <div key={side.team.id}>
                  <div className="border-line mb-1 flex items-baseline justify-between gap-3 border-b pb-2">
                    <p className="truncate text-sm font-semibold">{side.team.name}</p>
                    <p className="text-faint tnum shrink-0 text-xs">
                      Bench {formatPoints(benchPoints(side.team.id))}
                    </p>
                  </div>
                  <table className="w-full">
                    <tbody>
                      {slotsFor(side.team.id).map((slot, index, all) => {
                        const isFirstBench =
                          !slot.isStarter && (index === 0 || all[index - 1].isStarter);
                        return (
                          <tr
                            key={slot.id}
                            className={cn(
                              "hover:bg-surface transition-colors",
                              isFirstBench && "border-line border-t",
                            )}
                          >
                            <td
                              className={cn(
                                "w-12 py-1.5 text-2xs font-semibold",
                                slot.isStarter ? "text-brand" : "text-faint",
                              )}
                            >
                              {slot.slot}
                            </td>
                            <td className="py-1.5">
                              <span
                                className={cn(
                                  "text-sm",
                                  slot.isStarter ? "text-ink" : "text-muted",
                                )}
                              >
                                {slot.player.fullName}
                              </span>
                              <span className="text-faint ml-1.5 text-xs">
                                {slot.player.nflTeam}
                              </span>
                            </td>
                            <td
                              className={cn(
                                "tnum w-14 py-1.5 text-right text-sm",
                                slot.isStarter ? "text-ink font-medium" : "text-faint",
                              )}
                            >
                              {formatPoints(Number(slot.points))}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </Section>
      ) : (
        <p className="text-muted py-8 text-sm">
          {matchup.isComplete
            ? "No player-level detail was imported for this matchup."
            : "This matchup has not been played yet, and no lineups have been set."}
        </p>
      )}
    </PageContainer>
  );
}

function Figure({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="label mb-0.5">{label}</dt>
      <dd className="figure-num tnum text-lg">{value}</dd>
      {sub ? <p className="text-faint mt-0.5 truncate text-xs">{sub}</p> : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
