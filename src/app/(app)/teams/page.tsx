import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, Users } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewContext } from "@/lib/session";
import { getManagerTeams } from "@/lib/queries/career";
import { cn, formatPoints, formatRecord, ordinal } from "@/lib/utils";

export const metadata: Metadata = { title: "My Teams" };

export default async function TeamsPage() {
  const { viewer } = await requireViewContext();
  const teams = await getManagerTeams(viewer.id);

  // Grouped by league so the same franchise's name changes read as a story.
  const byLeague = new Map<string, typeof teams>();
  for (const team of teams) {
    const list = byLeague.get(team.league.id) ?? [];
    list.push(team);
    byLeague.set(team.league.id, list);
  }

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-8">
        <p className="eyebrow mb-2">Your history</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">My Teams</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Every team you have ever fielded, whatever you called it that year.
        </p>
      </header>

      {teams.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No teams linked yet"
          description="A commissioner needs to connect your account to the teams you managed."
        />
      ) : (
        <div className="space-y-10">
          {[...byLeague.values()].map((leagueTeams) => (
            <section key={leagueTeams[0].league.id}>
              <SectionHeader
                eyebrow={`${leagueTeams.length} seasons`}
                title={leagueTeams[0].league.name}
              />
              <ol className="border-line relative space-y-3 border-l pl-6">
                {leagueTeams.map((team) => (
                  <li key={team.id} className="relative">
                    <span
                      className={cn(
                        "ring-surface absolute top-5 -left-[31px] size-2.5 rounded-full ring-4",
                        team.isChampion
                          ? "bg-gold"
                          : team.isCurrent
                            ? "bg-ice"
                            : "bg-line-strong",
                      )}
                    />
                    <Link href={`/league/${team.league.slug}?season=${team.year}`}>
                      <Card
                        variant="flat"
                        className={cn(
                          "p-4 transition-colors hover:border-line-strong",
                          team.isChampion && "border-gold/40",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="stat-figure text-gold w-14 shrink-0 text-2xl">
                            {team.year}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 truncate font-bold">
                              {team.name}
                              {team.isChampion ? (
                                <Trophy className="text-gold size-4 shrink-0" />
                              ) : null}
                            </p>
                            <p className="text-subtle text-xs">
                              {formatRecord(team.wins, team.losses, team.ties)} ·{" "}
                              {formatPoints(team.pointsFor)} PF
                              {team.finalRank ? ` · finished ${ordinal(team.finalRank)}` : ""}
                            </p>
                          </div>
                          {team.isCurrent ? (
                            <Badge tone="ice" size="xs">
                              Active
                            </Badge>
                          ) : team.madePlayoffs ? (
                            <Badge tone="field" size="xs">
                              Playoffs
                            </Badge>
                          ) : null}
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
