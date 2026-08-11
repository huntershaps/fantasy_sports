import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { TrophyCase, type AwardCardData } from "@/components/cards/award-card";
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
  const milestones = teams.filter((t) => t.isChampion || t.isRunnerUp);

  const bySeason = new Map<string, AwardCardData[]>();
  for (const award of awards) {
    const list = bySeason.get(award.seasonLabel) ?? [];
    list.push(award);
    bySeason.set(award.seasonLabel, list);
  }
  const groups = [...bySeason.entries()]
    .map(([label, list]) => ({ label, awards: list }))
    .sort((a, b) => (a.label === "All Time" ? -1 : b.label.localeCompare(a.label)));

  return (
    <PageContainer width="wide" className="py-6">
      <header className="border-line mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b pb-5">
        <div className="flex items-center gap-4">
          <Avatar name={person.name} src={person.image} size="xl" rounded="full" />
          <div className="min-w-0">
            <p className="label mb-1">{isSelf ? "Your profile" : "Manager"}</p>
            <h1 className="text-2xl leading-none font-semibold">{person.name}</h1>
            {person.bio ? (
              <p className="text-muted mt-1.5 max-w-xl text-sm">{person.bio}</p>
            ) : null}
          </div>
        </div>

        <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
          <HeaderStat
            label="Career"
            value={formatRecord(career.wins, career.losses, career.ties)}
            sub={formatPercent(winPercentage(career.wins, career.losses, career.ties))}
          />
          <HeaderStat
            label="Titles"
            value={String(career.championships)}
            brand={career.championships > 0}
          />
          <HeaderStat label="Playoffs" value={String(career.playoffAppearances)} />
          <HeaderStat label="Seasons" value={String(career.seasons)} />
          <HeaderStat
            label="Total PF"
            value={Math.round(career.pointsFor).toLocaleString()}
          />
        </dl>
      </header>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Section>
            <SectionHeader
              label="Trophy cabinet"
              rule={false}
              action={<span className="text-faint text-xs">{awards.length} awards</span>}
            />
            {awards.length > 0 ? (
              <TrophyCase groups={groups} />
            ) : (
              <EmptyState
                title="Nothing in the cabinet yet"
                description={
                  isSelf
                    ? "Win a week, break a record, or make a catastrophic trade. All of them count."
                    : "This manager has not earned any awards yet."
                }
              />
            )}
          </Section>

          <Section className="mt-8">
            <SectionHeader label="Every team" title="Through the years" />
            <ul className="border-line divide-line divide-y border-t">
              {teams.map((team) => (
                <li key={team.id}>
                  <Link
                    href={`/league/${team.league.slug}?season=${team.year}`}
                    className="group hover:bg-surface -mx-3 flex flex-wrap items-baseline gap-x-5 gap-y-1 px-3 py-2.5 transition-colors"
                  >
                    <span className="figure-num tnum text-muted w-12 shrink-0 text-sm">
                      {team.year}
                    </span>
                    <span className="flex min-w-[10rem] flex-1 items-baseline gap-2">
                      <span className="group-hover:text-brand text-sm font-medium transition-colors">
                        {team.name}
                      </span>
                      {team.isChampion ? (
                        <Trophy className="text-brand size-3 shrink-0 self-center" />
                      ) : null}
                    </span>
                    <span className="text-faint w-32 shrink-0 truncate text-xs">
                      {team.league.name}
                    </span>
                    <span className="tnum shrink-0 text-sm">
                      {formatRecord(team.wins, team.losses, team.ties)}
                    </span>
                    <span className="text-faint w-10 shrink-0 text-right text-xs">
                      {team.finalRank ? ordinal(team.finalRank) : "—"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        <aside className="lg:col-span-4">
          {milestones.length > 0 ? (
            <Section>
              <SectionHeader label="Career timeline" rule={false} />
              <ol className="border-line relative space-y-4 border-l pl-5">
                {milestones.map((team) => (
                  <li key={team.id} className="relative">
                    <span
                      aria-hidden
                      className={cn(
                        "ring-base absolute top-1.5 -left-[23px] size-2 rounded-full ring-4",
                        team.isChampion ? "bg-brand" : "bg-line-strong",
                      )}
                    />
                    <p className="figure-num tnum text-muted text-xs">{team.year}</p>
                    <p className="text-ink mt-0.5 text-sm font-medium">
                      {team.isChampion ? "Won the championship" : "Lost in the final"}
                    </p>
                    <p className="text-faint text-xs">
                      {team.name} · {team.league.name}
                    </p>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          <Section className={milestones.length > 0 ? "mt-8" : undefined}>
            <SectionHeader label="Best and worst" />
            <dl className="border-line divide-line divide-y border-t">
              <SplitRow label="Best week" value={formatPoints(career.bestWeek)} />
              <SplitRow label="Worst week" value={formatPoints(career.worstWeek)} />
              <SplitRow label="Biggest win" value={`+${formatPoints(career.biggestWin)}`} />
              <SplitRow label="Biggest loss" value={`−${formatPoints(career.biggestLoss)}`} />
              <SplitRow label="Runner-up finishes" value={String(career.runnerUps)} />
            </dl>
          </Section>
        </aside>
      </div>
    </PageContainer>
  );
}

function HeaderStat({
  label,
  value,
  sub,
  brand,
}: {
  label: string;
  value: string;
  sub?: string;
  brand?: boolean;
}) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className={cn("figure-num tnum text-lg", brand ? "text-brand" : "text-ink")}>
        {value}
      </dd>
      {sub ? <p className="text-faint text-xs">{sub}</p> : null}
    </div>
  );
}

function SplitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-muted text-xs">{label}</dt>
      <dd className="tnum text-ink text-sm font-medium">{value}</dd>
    </div>
  );
}
