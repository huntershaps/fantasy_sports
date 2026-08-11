import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { LeagueRow } from "@/components/dashboard/league-row";
import { MemoryEntry, FeaturedMemory } from "@/components/cards/memory-card";
import { MatchupCard } from "@/components/cards/matchup-card";
import { requireViewContext } from "@/lib/session";
import { getCareerStats, getManagerTeams, getTeamForm } from "@/lib/queries/career";
import { listMemories, listOnThisDay } from "@/lib/queries/memories";
import { getUpcomingForUser } from "@/lib/queries/leagues";
import { formatRecord } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function HomePage() {
  const { actor, viewer } = await requireViewContext();
  const firstName = viewer.name.split(" ")[0];

  const [teams, career, onThisDay, myMemories, upcoming] = await Promise.all([
    getManagerTeams(viewer.id),
    getCareerStats(viewer.id),
    listOnThisDay(actor, viewer.id, 5),
    listMemories(actor, viewer.id, { filter: "mine", take: 9 }),
    getUpcomingForUser(actor, viewer.id, 4),
  ]);

  const currentTeams = teams.filter((t) => t.isCurrent);
  const forms = await Promise.all(currentTeams.map((team) => getTeamForm(team.id)));

  const featured = onThisDay[0] ?? myMemories[0] ?? null;
  const restOfArchive = (onThisDay.length > 0 ? onThisDay.slice(1) : myMemories.slice(1)).slice(0, 4);

  return (
    <PageContainer width="wide" className="py-6">
      {/* Compact header: greeting and career line share one row on desktop. */}
      <header className="border-line mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b pb-4">
        <div>
          <p className="label mb-1">{greeting()}, {firstName}</p>
          <h1 className="text-2xl leading-none font-semibold">{viewer.name}</h1>
        </div>

        {/* Four fit across a 390px screen; total points is the one that can
            wait for the profile page rather than wrapping to its own line. */}
        <dl className="grid w-full grid-cols-4 gap-x-4 gap-y-2 sm:flex sm:w-auto sm:gap-x-7">
          <CareerStat label="Career" value={formatRecord(career.wins, career.losses, career.ties)} />
          <CareerStat label="Titles" value={String(career.championships)} brand={career.championships > 0} />
          <CareerStat label="Playoffs" value={String(career.playoffAppearances)} />
          <CareerStat label="Seasons" value={String(career.seasons)} />
          <CareerStat
            label="Total PF"
            value={Math.round(career.pointsFor).toLocaleString()}
            className="hidden sm:block"
          />
        </dl>
      </header>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-12">
        {/* Primary column */}
        <div className="lg:col-span-7 xl:col-span-8">
          <Section>
            <SectionHeader
              label="Current season"
              title="Your leagues"
              rule={false}
              action={
                <Link href="/leagues" className="text-muted hover:text-ink text-xs">
                  All leagues
                </Link>
              }
            />
            {currentTeams.length > 0 ? (
              <div className="border-line border-t">
                {currentTeams.map((team, i) => (
                  <LeagueRow key={team.id} team={team} form={forms[i]} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No active season"
                description="When a season is in progress, your standing shows up here."
              />
            )}
          </Section>

          {upcoming.length > 0 ? (
            <Section className="mt-8">
              <SectionHeader label="This week" title="Coming up" />
              <div className="grid gap-3 sm:grid-cols-2">
                {upcoming.map((matchup) => (
                  <MatchupCard key={matchup.id} matchup={matchup} />
                ))}
              </div>
            </Section>
          ) : null}

          <Section className="mt-8">
            <SectionHeader
              label="Your history"
              title="Memories with you in them"
              action={
                <Link
                  href="/memories?filter=mine"
                  className="text-muted hover:text-ink inline-flex items-center gap-1 text-xs"
                >
                  See all <ArrowRight className="size-3" />
                </Link>
              }
            />
            {myMemories.length > 0 ? (
              <div className="border-line border-t">
                {myMemories.slice(0, 6).map((memory) => (
                  <MemoryEntry key={memory.id} memory={memory} showLeague />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No memories yet"
                description="Once your leagues have history, the good and the unforgivable show up here."
              />
            )}
          </Section>
        </div>

        {/* Secondary column — editorial, not a sidebar of widgets */}
        <aside className="lg:col-span-5 xl:col-span-4">
          {featured ? (
            <Section className="border-line border-t pt-5">
              <FeaturedMemory
                memory={featured}
                label={onThisDay.length > 0 ? "This day in league history" : "From the archives"}
              />
            </Section>
          ) : null}

          {restOfArchive.length > 0 ? (
            <Section className="mt-7">
              <SectionHeader label="Also on this date" />
              <div className="border-line border-t">
                {restOfArchive.map((memory) => (
                  <MemoryEntry key={memory.id} memory={memory} showLeague />
                ))}
              </div>
            </Section>
          ) : null}

          <Section className="mt-7">
            <SectionHeader label="Career" title="Best and worst" />
            <dl className="border-line divide-line divide-y border-t">
              <SplitRow label="Best week" value={career.bestWeek.toFixed(2)} />
              <SplitRow label="Worst week" value={career.worstWeek.toFixed(2)} />
              <SplitRow label="Biggest win" value={`+${career.biggestWin.toFixed(2)}`} />
              <SplitRow label="Biggest loss" value={`−${career.biggestLoss.toFixed(2)}`} />
              <SplitRow
                label="Runner-up finishes"
                value={String(career.runnerUps)}
              />
            </dl>
          </Section>
        </aside>
      </div>
    </PageContainer>
  );
}

function CareerStat({
  label,
  value,
  brand,
  className,
}: {
  label: string;
  value: string;
  brand?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="label mb-0.5">{label}</dt>
      <dd
        className={`figure-num tnum text-lg ${brand ? "text-brand" : "text-ink"}`}
      >
        {value}
      </dd>
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

export const dynamic = "force-dynamic";
