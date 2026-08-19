import Link from "next/link";
import { Trophy } from "lucide-react";
import { FormStrip, Streak } from "@/components/ui/badge";
import { Crest } from "@/components/ui/crest";
import type { ManagerTeam, getTeamForm } from "@/lib/queries/career";
import { cn, formatPoints, formatRecord, ordinal } from "@/lib/utils";

type Form = Awaited<ReturnType<typeof getTeamForm>>;

/** A league standing as a dense row rather than a card. Three tiers of weight:
 *  team name reads first, record and rank second, the stat strip last.
 *
 *  On narrow screens each tier gets its own line — cramming the next-opponent
 *  line beside the team name is what made the first version feel squeezed. */
export function LeagueRow({
  team,
  form,
  playoffCutoff = 6,
}: {
  team: ManagerTeam;
  form: Form;
  playoffCutoff?: number;
}) {
  const avg = form.played.length > 0 ? team.pointsFor / form.played.length : 0;
  const inPlayoffs = (team.rank ?? 99) <= playoffCutoff;

  return (
    <div className="border-line border-b py-4 last:border-b-0">
      <div className="flex items-baseline gap-x-3">
        <Link
          href={`/league/${team.league.slug}`}
          className="label hover:opacity-80 truncate transition-opacity"
          style={{ color: team.league.accentColor }}
        >
          {team.league.name}
        </Link>
        <span className="text-faint tnum text-xs">{team.year}</span>

        <span className="ml-auto flex shrink-0 items-baseline gap-2.5">
          <span className="tnum text-ink text-base font-semibold">
            {formatRecord(team.wins, team.losses, team.ties)}
          </span>
          <span className={cn("tnum text-xs", inPlayoffs ? "text-ink" : "text-faint")}>
            {team.rank ? ordinal(team.rank) : "—"}
          </span>
        </span>
      </div>

      <div className="mt-1 flex items-center gap-2.5">
        <Crest name={team.name} src={team.logoUrl} size="lg" shape="round" />
        <Link
          href={`/league/${team.league.slug}`}
          className="text-ink hover:text-brand truncate text-lg font-semibold transition-colors"
        >
          {team.name}
        </Link>
        {team.isChampion ? <Trophy className="text-brand size-3.5 shrink-0" /> : null}
      </div>

      {form.next ? (
        <p className="text-muted mt-1 truncate text-xs">
          Next · Week {form.next.week} vs{" "}
          <span className="text-ink">{form.next.opponent.name}</span>
        </p>
      ) : null}

      <dl className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
        <Metric label="PF" value={formatPoints(team.pointsFor)} />
        <Metric label="AVG" value={avg > 0 ? avg.toFixed(1) : "—"} />
        <div className="flex items-baseline gap-1.5">
          <dt className="label">Streak</dt>
          <dd>
            <Streak type={form.streakType} length={form.streak} />
          </dd>
        </div>
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <dt className="label">Form</dt>
          <dd>
            <FormStrip results={form.recent.map((g) => g.result)} />
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="label">{label}</dt>
      <dd className="tnum text-ink font-medium">{value}</dd>
    </div>
  );
}
