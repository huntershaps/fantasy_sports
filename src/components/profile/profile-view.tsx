import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";
import { AwardCard, type AwardCardData } from "@/components/cards/award-card";
import type { CareerStats, ManagerTeam } from "@/lib/queries/career";
import {
  cn,
  formatPercent,
  formatPoints,
  formatRecord,
  ordinal,
  winPercentage,
} from "@/lib/utils";

export function ProfileView({
  person,
  career,
  teams,
  awards,
  isSelf,
}: {
  person: { id: string; name: string; image: string | null; bio: string | null };
  career: CareerStats;
  teams: ManagerTeam[];
  awards: AwardCardData[];
  isSelf: boolean;
}) {
  const titles = teams.filter((t) => t.isChampion);

  return (
    <PageContainer className="space-y-12 py-8 sm:py-10">
      <header className="flex flex-wrap items-center gap-6">
        <Avatar name={person.name} src={person.image} size="2xl" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow mb-2">{isSelf ? "Your profile" : "Manager"}</p>
          <h1 className="text-4xl font-extrabold sm:text-5xl">{person.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {career.championships > 0 ? (
              <Badge tone="gold" size="md">
                <Trophy />
                {career.championships} championship
                {career.championships === 1 ? "" : "s"}
              </Badge>
            ) : null}
            <Badge size="md">{career.seasons} seasons</Badge>
            <Badge size="md">
              {formatRecord(career.wins, career.losses, career.ties)} all time
            </Badge>
          </div>
          {person.bio ? (
            <p className="text-muted mt-4 max-w-2xl leading-relaxed">{person.bio}</p>
          ) : null}
        </div>
      </header>

      <section>
        <SectionHeader eyebrow="Career" title="By the numbers" />
        <StatGrid columns={5}>
          <Stat
            label="Record"
            value={formatRecord(career.wins, career.losses, career.ties)}
            sub={formatPercent(winPercentage(career.wins, career.losses, career.ties))}
          />
          <Stat
            label="Total points"
            value={Math.round(career.pointsFor).toLocaleString()}
          />
          <Stat label="Best week" value={formatPoints(career.bestWeek)} tone="field" />
          <Stat label="Worst week" value={formatPoints(career.worstWeek)} tone="ember" />
          <Stat
            label="Playoffs"
            value={career.playoffAppearances}
            sub={`${career.runnerUps} runner-up`}
          />
        </StatGrid>
      </section>

      {titles.length > 0 ? (
        <section>
          <SectionHeader eyebrow="Career timeline" title="The moments that counted" />
          <ol className="border-line relative space-y-5 border-l pl-6">
            {teams
              .filter((t) => t.isChampion || t.isRunnerUp || t.finalRank === 1)
              .map((team) => (
                <li key={team.id} className="relative">
                  <span
                    className={cn(
                      "absolute top-1.5 -left-[31px] size-2.5 rounded-full ring-4",
                      team.isChampion
                        ? "bg-gold ring-gold-wash"
                        : "bg-line-strong ring-surface",
                    )}
                  />
                  <p className="eyebrow mb-1">{team.year}</p>
                  <p className="font-semibold">
                    {team.isChampion ? "Won the championship" : "Lost in the final"} ·{" "}
                    {team.league.name}
                  </p>
                  <p className="text-subtle text-sm">
                    {team.name} · {formatRecord(team.wins, team.losses, team.ties)}
                  </p>
                </li>
              ))}
          </ol>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="Trophy cabinet"
          title={awards.length > 0 ? `${awards.length} awards` : "Trophy cabinet"}
        />
        {awards.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {awards.map((award) => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="Nothing in the cabinet yet"
            description={
              isSelf
                ? "Win a week, break a record, or make a catastrophic trade. All of them count."
                : "This manager has not earned any awards yet."
            }
          />
        )}
      </section>

      <section>
        <SectionHeader eyebrow="Every team" title="Through the years" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Link key={team.id} href={`/league/${team.league.slug}?season=${team.year}`}>
              <Card
                variant="flat"
                className={cn(
                  "h-full p-4 transition-colors hover:border-line-strong",
                  team.isChampion && "border-gold/40",
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="eyebrow">{team.year}</span>
                  {team.isChampion ? (
                    <Trophy className="text-gold size-4" />
                  ) : team.isCurrent ? (
                    <Badge tone="ice" size="xs">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate font-bold">{team.name}</p>
                <p className="text-subtle truncate text-xs">{team.league.name}</p>
                <div className="text-muted mt-3 flex items-center gap-3 text-sm">
                  <span className="font-semibold tabular">
                    {formatRecord(team.wins, team.losses, team.ties)}
                  </span>
                  <span className="tabular">{formatPoints(team.pointsFor)} PF</span>
                  {team.finalRank ? (
                    <span className="text-subtle ml-auto text-xs">
                      {ordinal(team.finalRank)}
                    </span>
                  ) : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </PageContainer>
  );
}
