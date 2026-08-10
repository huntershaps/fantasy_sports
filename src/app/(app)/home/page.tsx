import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge, ResultBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";
import { Avatar } from "@/components/ui/avatar";
import { MemoryCard } from "@/components/cards/memory-card";
import { requireViewContext } from "@/lib/session";
import { getCareerStats, getManagerTeams, getTeamForm } from "@/lib/queries/career";
import { listMemories, listOnThisDay } from "@/lib/queries/memories";
import { getLatestAward } from "@/lib/queries/awards";
import { cn, formatPercent, formatPoints, formatRecord, ordinal, winPercentage } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const { actor, viewer } = await requireViewContext();
  const firstName = viewer.name.split(" ")[0];

  const [teams, career, onThisDay, recentMemories, latestAward] = await Promise.all([
    getManagerTeams(viewer.id),
    getCareerStats(viewer.id),
    listOnThisDay(actor, viewer.id, 6),
    listMemories(actor, viewer.id, { filter: "mine", take: 8 }),
    getLatestAward(actor, viewer.id),
  ]);

  const currentTeams = teams.filter((t) => t.isCurrent);

  return (
    <PageContainer className="space-y-12 py-8 sm:py-10">
      <header>
        <p className="eyebrow mb-2">Your dashboard</p>
        <h1 className="text-4xl leading-[0.95] font-extrabold sm:text-6xl">
          Welcome back, {firstName}.
        </h1>
        {career.seasons > 0 ? (
          <p className="text-muted mt-4 max-w-2xl text-lg">
            {career.seasons} season{career.seasons === 1 ? "" : "s"} on record ·{" "}
            {formatRecord(career.wins, career.losses, career.ties)} all time
            {career.championships > 0
              ? ` · ${career.championships} championship${career.championships === 1 ? "" : "s"}`
              : ""}
            .
          </p>
        ) : null}
      </header>

      {currentTeams.length > 0 ? (
        <section>
          <SectionHeader eyebrow="This season" title="Where you stand" />
          <div className="grid gap-4 lg:grid-cols-2">
            {currentTeams.map((team) => (
              <CurrentSeasonCard key={team.id} team={team} />
            ))}
          </div>
        </section>
      ) : null}

      {latestAward ? (
        <section>
          <SectionHeader eyebrow="Recent achievement" title="Look what you did" />
          <Card
            variant="raised"
            style={{ ["--award" as string]: latestAward.card.accentColor }}
            className="relative overflow-hidden p-6 sm:p-8"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                background:
                  "radial-gradient(90% 120% at 0% 0%, var(--award), transparent 60%)",
              }}
            />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <span
                className="grid size-20 shrink-0 place-items-center rounded-3xl text-5xl"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--award) 16%, transparent)",
                }}
              >
                {latestAward.card.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow mb-1.5">{latestAward.card.seasonLabel}</p>
                <h3 className="text-2xl font-extrabold sm:text-3xl">
                  {latestAward.card.name}
                </h3>
                <p className="text-muted mt-2 leading-relaxed">
                  {latestAward.card.description}
                </p>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href={`/awards/${latestAward.card.id}`}>
                  View award <ArrowRight />
                </Link>
              </Button>
            </div>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="This day in league history"
          title={onThisDay.length > 0 ? "On this day" : "Nothing on this date"}
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/memories">
                All memories <ArrowRight />
              </Link>
            </Button>
          }
        />
        {onThisDay.length > 0 ? (
          <>
            {/* Rail on mobile, grid on desktop — same cards, no duplicate markup. */}
            <div className="rail -mx-4 px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-3">
              {onThisDay.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  showLeague
                  className="rail-item w-[85vw] max-w-sm sm:w-auto sm:max-w-none"
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={CalendarClock}
            title="No anniversaries today"
            description="Nothing happened in your leagues on this date. Check back tomorrow — the archive keeps every day."
            action={
              <Button asChild variant="subtle">
                <Link href="/memories">Browse all memories</Link>
              </Button>
            }
          />
        )}
      </section>

      {career.seasons > 0 ? (
        <section>
          <SectionHeader eyebrow="Career" title="Your numbers" />
          <StatGrid columns={5}>
            <Stat
              label="Championships"
              value={career.championships}
              tone={career.championships > 0 ? "gold" : "muted"}
              sub={career.runnerUps > 0 ? `${career.runnerUps} runner-up` : undefined}
            />
            <Stat
              label="Career record"
              value={formatRecord(career.wins, career.losses, career.ties)}
              sub={formatPercent(winPercentage(career.wins, career.losses, career.ties))}
            />
            <Stat
              label="Total points"
              value={Math.round(career.pointsFor).toLocaleString()}
              sub={`${career.seasons} seasons`}
            />
            <Stat
              label="Best week"
              value={formatPoints(career.bestWeek)}
              tone="field"
              sub="Single-week high"
            />
            <Stat
              label="Worst week"
              value={formatPoints(career.worstWeek)}
              tone="ember"
              sub="Single-week low"
            />
          </StatGrid>

          <StatGrid columns={3} className="mt-4">
            <Stat
              label="Playoff appearances"
              value={career.playoffAppearances}
              size="sm"
            />
            <Stat
              label="Biggest win"
              value={`+${formatPoints(career.biggestWin)}`}
              size="sm"
              tone="field"
            />
            <Stat
              label="Biggest loss"
              value={`−${formatPoints(career.biggestLoss)}`}
              size="sm"
              tone="ember"
            />
          </StatGrid>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="Your history"
          title="Memories with you in them"
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/memories?filter=mine">
                See all <ArrowRight />
              </Link>
            </Button>
          }
        />
        {recentMemories.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {recentMemories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} showLeague />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Sparkles}
            title="No memories yet"
            description="Once your leagues have history, this is where the good, bad, and unforgivable moments show up."
          />
        )}
      </section>
    </PageContainer>
  );
}

async function CurrentSeasonCard({
  team,
}: {
  team: Awaited<ReturnType<typeof getManagerTeams>>[number];
}) {
  const form = await getTeamForm(team.id);
  const playoffCutoff = 6;
  const inPlayoffs = (team.rank ?? 99) <= playoffCutoff;

  return (
    <Card variant="raised" className="overflow-hidden">
      <div className="border-line flex items-center gap-3 border-b px-5 py-4">
        <Avatar name={team.name} src={team.logoUrl} size="md" rounded="card" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{team.name}</p>
          <Link
            href={`/league/${team.league.slug}`}
            className="text-subtle hover:text-muted truncate text-xs"
          >
            {team.league.name} · {team.year}
          </Link>
        </div>
        <Badge tone={inPlayoffs ? "field" : "neutral"} size="sm">
          {team.rank ? `${ordinal(team.rank)} place` : "Unranked"}
        </Badge>
      </div>

      <div className="divide-line grid grid-cols-3 divide-x">
        <div className="p-4">
          <p className="eyebrow mb-1">Record</p>
          <p className="stat-figure text-2xl">
            {formatRecord(team.wins, team.losses, team.ties)}
          </p>
        </div>
        <div className="p-4">
          <p className="eyebrow mb-1">Points for</p>
          <p className="stat-figure text-2xl">{formatPoints(team.pointsFor)}</p>
        </div>
        <div className="p-4">
          <p className="eyebrow mb-1">Streak</p>
          <p
            className={cn(
              "stat-figure text-2xl",
              form.streakType === "W" && "text-field",
              form.streakType === "L" && "text-ember",
            )}
          >
            {form.streakType ? `${form.streakType}${form.streak}` : "—"}
          </p>
        </div>
      </div>

      <div className="border-line flex items-center gap-4 border-t px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="eyebrow">Form</span>
          <div className="flex gap-1">
            {form.recent.length > 0 ? (
              form.recent.map((game) => (
                <ResultBadge key={game.id} result={game.result} />
              ))
            ) : (
              <span className="text-subtle text-xs">No games yet</span>
            )}
          </div>
        </div>

        {form.next ? (
          <p className="text-subtle ml-auto truncate text-xs">
            Next: wk {form.next.week} vs {form.next.opponent.name}
          </p>
        ) : (
          <Link
            href={`/league/${team.league.slug}`}
            className="text-gold ml-auto shrink-0 text-xs font-semibold hover:underline"
          >
            League page
          </Link>
        )}
      </div>
    </Card>
  );
}

export const dynamic = "force-dynamic";
