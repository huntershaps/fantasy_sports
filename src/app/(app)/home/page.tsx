import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Flame, Snowflake, Trophy, Zap } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Crest } from "@/components/ui/crest";
import { LeagueCard } from "@/components/dashboard/league-card";
import { MemoryEntry } from "@/components/cards/memory-card";
import { requireViewContext } from "@/lib/session";
import { getCareerStats, getManagerTeams, getTeamForm } from "@/lib/queries/career";
import { listMemories, listOnThisDay } from "@/lib/queries/memories";
import { getUpcomingForUser } from "@/lib/queries/leagues";
import { cn, formatPoints, formatRecord } from "@/lib/utils";

export const metadata: Metadata = { title: "Home" };

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function HomePage() {
  const { actor, viewer } = await requireViewContext();

  const [teams, career, onThisDay, myMemories, upcoming] = await Promise.all([
    getManagerTeams(viewer.id),
    getCareerStats(viewer.id),
    listOnThisDay(actor, viewer.id, 4),
    listMemories(actor, viewer.id, { filter: "mine", take: 6 }),
    // One upcoming game per league keeps the panel to a glanceable length.
    getUpcomingForUser(actor, viewer.id, 2),
  ]);

  const currentTeams = teams.filter((t) => t.isCurrent);
  const details = await Promise.all(
    currentTeams.map(async (team) => ({
      team,
      form: await getTeamForm(team.id),
    })),
  );

  const recentMemory = onThisDay[0] ?? myMemories[0] ?? null;
  const archive = (onThisDay.length > 1 ? onThisDay.slice(1) : myMemories.slice(1)).slice(0, 4);

  return (
    <PageContainer width="wide" className="space-y-6 py-6">
      {/* Header: greeting, name, and the career figures as bordered blocks. */}
      <header>
        <p className="label mb-1.5">{greeting()}</p>
        <h1 className="font-display text-2xl leading-none font-semibold sm:text-3xl">
          {viewer.name}
        </h1>

        <dl className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <HeaderStat label="Career Record" value={formatRecord(career.wins, career.losses, career.ties)} />
          <HeaderStat
            label="Titles"
            value={String(career.championships)}
            icon={career.championships > 0 ? Trophy : undefined}
            tone={career.championships > 0 ? "brand" : "default"}
          />
          <HeaderStat label="Playoff Appearances" value={String(career.playoffAppearances)} />
          <HeaderStat label="Seasons" value={String(career.seasons)} />
        </dl>
      </header>

      <Section>
        <SectionHeader
          label="Your Leagues"
          rule={false}
          action={
            <Link
              href="/leagues"
              className="text-muted hover:text-ink inline-flex items-center gap-1 text-xs"
            >
              View all leagues <ArrowRight className="size-3" />
            </Link>
          }
        />
        {details.length > 0 ? (
          <div className="space-y-3">
            {details.map(({ team, form }) => (
              <LeagueCard
                key={team.id}
                team={team}
                form={form}
                pointsAgainst={form.played.reduce((sum, g) => sum + g.opponentScore, 0)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active season"
            description="When a season is in progress, your team shows up here."
          />
        )}
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        <Section className="border-line bg-surface rounded-lg border">
          <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="label">This Week</h2>
            <Link
              href="/schedule"
              className="text-muted hover:text-ink inline-flex items-center gap-1 text-xs"
            >
              All matchups <ArrowRight className="size-3" />
            </Link>
          </div>
          {upcoming.length > 0 ? (
            <ul className="divide-line divide-y">
              {upcoming.flatMap((matchup) =>
                [matchup.away, matchup.home].map((side) => (
                  <li key={`${matchup.id}-${side.id}`}>
                    <Link
                      href={`/matchup/${matchup.id}`}
                      className="hover:bg-surface-2 flex items-center gap-3 px-4 py-2.5 transition-colors"
                    >
                      <Crest name={side.name} src={side.logoUrl} size="md" shape="round" />
                      <span className="min-w-0 flex-1 truncate text-sm">{side.name}</span>
                      <span className="text-faint tnum shrink-0 text-sm">
                        {matchup.isComplete ? formatPoints(side.score) : "—"}
                      </span>
                    </Link>
                  </li>
                )),
              )}
            </ul>
          ) : (
            <p className="text-muted px-4 py-6 text-sm">No upcoming matchups.</p>
          )}
        </Section>

        <Section className="border-line bg-surface rounded-lg border">
          <div className="border-line flex items-center justify-between gap-3 border-b px-4 py-3">
            <h2 className="label">Recent Memory</h2>
            {recentMemory ? (
              <span className="text-faint tnum text-xs">
                {dateFormat.format(recentMemory.occurredOn)}
              </span>
            ) : null}
          </div>
          {recentMemory ? (
            <div className="p-4">
              <p className="text-ink text-md leading-snug text-pretty">
                {recentMemory.rendered.text}
              </p>
              {recentMemory.rendered.detail ? (
                <p className="text-muted mt-2 text-sm">{recentMemory.rendered.detail}</p>
              ) : null}
              <Link
                href={`/memories/${recentMemory.id}`}
                className="text-info mt-4 inline-flex items-center gap-1 text-xs font-medium hover:underline"
              >
                View Memory <ArrowRight className="size-3" />
              </Link>
            </div>
          ) : (
            <p className="text-muted px-4 py-6 text-sm">No memories yet.</p>
          )}
        </Section>
      </div>

      <Section>
        <SectionHeader label="At a Glance" rule={false} />
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <GlanceCard
            label="Highest Score"
            value={formatPoints(career.bestWeek)}
            tone="info"
            icon={Zap}
          />
          <GlanceCard
            label="Lowest Score"
            value={formatPoints(career.worstWeek)}
            tone="loss"
            icon={Snowflake}
          />
          <GlanceCard
            label="Biggest Win"
            value={formatPoints(career.biggestWin)}
            tone="win"
            icon={Trophy}
          />
          <GlanceCard
            label="Runner-Up Finishes"
            value={String(career.runnerUps)}
            tone="brand"
            icon={Flame}
          />
        </div>
      </Section>

      {archive.length > 0 ? (
        <Section>
          <SectionHeader
            label="From the Archives"
            action={
              <Link
                href="/memories?filter=mine"
                className="text-muted hover:text-ink inline-flex items-center gap-1 text-xs"
              >
                All memories <ArrowRight className="size-3" />
              </Link>
            }
          />
          <div className="border-line border-t">
            {archive.map((memory) => (
              <MemoryEntry key={memory.id} memory={memory} showLeague />
            ))}
          </div>
        </Section>
      ) : null}
    </PageContainer>
  );
}

function HeaderStat({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "brand";
}) {
  return (
    <div className="border-line bg-surface rounded-lg border px-4 py-3">
      <dt className="label mb-1.5 truncate">{label}</dt>
      <dd className="flex items-center gap-1.5">
        {Icon ? <Icon className="text-brand size-4 shrink-0" /> : null}
        <span
          className={cn(
            "font-display tnum text-xl font-semibold",
            tone === "brand" && "text-brand",
          )}
        >
          {value}
        </span>
      </dd>
    </div>
  );
}

const GLANCE_TONES = {
  info: "text-info",
  loss: "text-loss",
  win: "text-win",
  brand: "text-brand",
} as const;

function GlanceCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: keyof typeof GLANCE_TONES;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="border-line bg-surface rounded-lg border p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className={cn("text-xs font-medium", GLANCE_TONES[tone])}>{label}</p>
        <Icon className={cn("size-4 shrink-0 opacity-70", GLANCE_TONES[tone])} />
      </div>
      <p className={cn("font-display tnum text-2xl font-semibold", GLANCE_TONES[tone])}>
        {value}
      </p>
    </div>
  );
}

export const dynamic = "force-dynamic";
