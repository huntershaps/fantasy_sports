import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import { Crest } from "@/components/ui/crest";
import { FormStrip } from "@/components/ui/badge";
import type { ManagerTeam, getTeamForm } from "@/lib/queries/career";
import { cn, formatPoints, formatRecord, ordinal } from "@/lib/utils";

type Form = Awaited<ReturnType<typeof getTeamForm>>;

/** The dashboard's headline object: crest, identity, record, then a four-stat
 *  strip and recent form. Three weight tiers so the eye lands on the team name
 *  and the record before anything else. */
export function LeagueCard({
  team,
  form,
  pointsAgainst,
  playoffCutoff = 6,
}: {
  team: ManagerTeam;
  form: Form;
  pointsAgainst: number;
  playoffCutoff?: number;
}) {
  const played = form.played.length;
  const avg = played > 0 ? team.pointsFor / played : 0;
  const inPlayoffs = (team.rank ?? 99) <= playoffCutoff;

  return (
    <article className="border-line bg-surface rounded-lg border">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <Crest name={team.name} src={team.logoUrl} size="3xl" className="hidden sm:block" />
        <Crest name={team.name} src={team.logoUrl} size="xl" className="sm:hidden" />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <Link
              href={`/league/${team.league.slug}`}
              className="label truncate transition-opacity hover:opacity-80"
              style={{ color: team.league.accentColor }}
            >
              {team.league.name}
            </Link>
            <span className="text-faint tnum text-xs">{team.year} Season</span>
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <Link
              href={`/league/${team.league.slug}`}
              className="font-display hover:text-brand truncate text-xl font-semibold transition-colors sm:text-2xl"
            >
              {team.name}
            </Link>
            {team.isChampion ? <Trophy className="text-brand size-4 shrink-0" /> : null}
          </div>

          {form.next ? (
            <div className="mt-3">
              <p className="label mb-1">Next matchup</p>
              <div className="flex items-center gap-2">
                <Crest
                  name={form.next.opponent.name}
                  src={form.next.opponent.logoUrl}
                  size="sm"
                  shape="round"
                />
                <p className="text-ink truncate text-sm">
                  Week {form.next.week} vs {form.next.opponent.name}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 text-right">
          <p className="font-display tnum text-2xl leading-none font-semibold sm:text-3xl">
            {formatRecord(team.wins, team.losses, team.ties)}
          </p>
          <p
            className={cn(
              "mt-1.5 text-xs font-medium",
              inPlayoffs ? "text-info" : "text-faint",
            )}
          >
            {team.rank ? `${ordinal(team.rank)} Place` : "Unranked"}
          </p>
        </div>
      </div>

      <dl className="border-line divide-line grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
        <Metric label="Points For" value={formatPoints(team.pointsFor)} />
        <Metric label="Avg Points" value={avg > 0 ? avg.toFixed(1) : "—"} />
        <Metric label="Points Against" value={formatPoints(pointsAgainst)} />
        <Metric
          label="Streak"
          value={form.streakType ? `${form.streakType}${form.streak}` : "—"}
          tone={
            form.streakType === "W" ? "win" : form.streakType === "L" ? "loss" : "default"
          }
        />
      </dl>

      <div className="border-line flex items-center gap-3 border-t px-4 py-3 sm:px-5">
        <span className="label">Form</span>
        <FormStrip results={form.recent.map((g) => g.result)} />
        <Link
          href={`/league/${team.league.slug}`}
          className="border-line-strong text-ink hover:bg-surface-2 ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors"
        >
          View League
          <ArrowRight className="size-3" />
        </Link>
      </div>
    </article>
  );
}

function Metric({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "win" | "loss";
}) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <dt className="label mb-1">{label}</dt>
      <dd
        className={cn(
          "font-display tnum text-lg font-semibold",
          tone === "win" && "text-win",
          tone === "loss" && "text-loss",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
