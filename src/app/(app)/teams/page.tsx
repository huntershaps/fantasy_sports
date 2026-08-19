import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Crest } from "@/components/ui/crest";
import { requireViewContext } from "@/lib/session";
import { getManagerTeams } from "@/lib/queries/career";
import { cn, formatPoints, formatRecord, ordinal } from "@/lib/utils";

export const metadata: Metadata = { title: "My Teams" };

export default async function TeamsPage() {
  const { viewer } = await requireViewContext();
  const teams = await getManagerTeams(viewer.id);

  const byLeague = new Map<string, typeof teams>();
  for (const team of teams) {
    const list = byLeague.get(team.league.id) ?? [];
    list.push(team);
    byLeague.set(team.league.id, list);
  }

  return (
    <PageContainer className="py-6">
      <PageHeader
        label="Your history"
        title="My Teams"
        description="Every team you have fielded, whatever you called it that year."
      />

      {teams.length === 0 ? (
        <EmptyState
          title="No teams linked yet"
          description="A commissioner needs to connect your account to the teams you managed."
        />
      ) : (
        <div className="space-y-8">
          {[...byLeague.values()].map((leagueTeams) => (
            <Section key={leagueTeams[0].league.id}>
              <SectionHeader
                label={leagueTeams[0].league.name}
                action={
                  <span className="text-faint text-xs">
                    {leagueTeams.length} seasons
                  </span>
                }
              />
              <ul className="border-line divide-line divide-y border-t">
                {leagueTeams.map((team) => (
                  <li key={team.id}>
                    <Link
                      href={`/league/${team.league.slug}?season=${team.year}`}
                      className="group hover:bg-surface -mx-3 flex flex-wrap items-center gap-x-5 gap-y-1 px-3 py-3 transition-colors"
                    >
                      <span className="figure-num tnum text-muted w-12 shrink-0 text-base">
                        {team.year}
                      </span>

                      <Crest
                        name={team.name}
                        src={team.logoUrl}
                        size="md"
                        shape="round"
                      />

                      <span className="flex min-w-[12rem] flex-1 items-baseline gap-2">
                        <span
                          className={cn(
                            "group-hover:text-brand text-sm font-medium transition-colors",
                            team.isChampion && "text-ink",
                          )}
                        >
                          {team.name}
                        </span>
                        {team.isChampion ? (
                          <Trophy className="text-brand size-3 shrink-0 self-center" />
                        ) : null}
                        {team.isCurrent ? (
                          <span className="text-faint text-xs">· active</span>
                        ) : null}
                      </span>

                      <span className="tnum shrink-0 text-sm font-medium">
                        {formatRecord(team.wins, team.losses, team.ties)}
                      </span>
                      <span className="tnum text-muted w-20 shrink-0 text-right text-sm">
                        {formatPoints(team.pointsFor)}
                      </span>
                      <span className="text-faint w-12 shrink-0 text-right text-xs">
                        {team.finalRank ? ordinal(team.finalRank) : "—"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
