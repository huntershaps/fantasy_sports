import Link from "next/link";
import type { MatchupSummary } from "@/lib/queries/leagues";
import { cn, formatPoints } from "@/lib/utils";

const ROUND_LABEL: Record<string, string> = {
  QUARTERFINAL: "Quarterfinal",
  SEMIFINAL: "Semifinal",
  CHAMPIONSHIP: "Championship",
  THIRD_PLACE: "Third place",
  CONSOLATION: "Consolation",
};

/**
 * Two lines, aligned scores, winner carried by weight rather than colour.
 * Reads as a results table entry, which is what it is.
 *
 * `showWeek` is off on the schedule, where cards already sit under a "Week n"
 * heading — repeating it on every card buried the team names under a row of
 * chrome. It stays on wherever cards appear out of week order.
 */
export function MatchupCard({
  matchup,
  highlightTeamId,
  showWeek = true,
  className,
}: {
  matchup: MatchupSummary;
  highlightTeamId?: string | null;
  showWeek?: boolean;
  className?: string;
}) {
  const round = ROUND_LABEL[matchup.type];
  const hasMeta = showWeek || Boolean(round);

  return (
    <Link
      href={`/matchup/${matchup.id}`}
      aria-label={`Week ${matchup.week}: ${matchup.away.name} versus ${matchup.home.name}`}
      className={cn(
        "border-line hover:border-line-strong hover:bg-surface block rounded-md border px-3.5 py-3 transition-colors",
        matchup.type === "CHAMPIONSHIP" && "border-brand/35",
        className,
      )}
    >
      {hasMeta ? (
        <div className="text-faint mb-2 flex items-baseline justify-between gap-2 text-xs">
          {showWeek ? <span className="label">Week {matchup.week}</span> : <span />}
          {round ? (
            <span className={cn(matchup.type === "CHAMPIONSHIP" && "text-brand")}>{round}</span>
          ) : null}
        </div>
      ) : null}

      <TeamLine
        side={matchup.away}
        isWinner={matchup.winnerTeamId === matchup.away.id}
        isComplete={matchup.isComplete}
        isMine={highlightTeamId === matchup.away.id}
      />

      {/* An unplayed game has no scores to align, so a divider carries the
          pairing instead of two empty dashes. */}
      {!matchup.isComplete ? (
        <div className="my-1 flex items-center gap-2" aria-hidden>
          <span className="bg-line h-px flex-1" />
          <span className="text-faint text-[0.625rem] tracking-[0.18em] uppercase">vs</span>
          <span className="bg-line h-px flex-1" />
        </div>
      ) : null}

      <TeamLine
        side={matchup.home}
        isWinner={matchup.winnerTeamId === matchup.home.id}
        isComplete={matchup.isComplete}
        isMine={highlightTeamId === matchup.home.id}
      />
    </Link>
  );
}

function TeamLine({
  side,
  isWinner,
  isComplete,
  isMine,
}: {
  side: MatchupSummary["home"];
  isWinner: boolean;
  isComplete: boolean;
  isMine: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      {/* A thin marker beats a filled row for showing the winner. */}
      <span
        aria-hidden
        className={cn(
          "h-3 w-0.5 shrink-0 self-center rounded-full",
          isComplete && isWinner ? "bg-brand" : "bg-transparent",
        )}
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          isComplete && !isWinner ? "text-muted" : "text-ink font-medium",
          isMine && "underline decoration-brand/50 underline-offset-2",
        )}
      >
        {side.name}
      </span>
      {isComplete ? (
        <span
          className={cn(
            "tnum shrink-0 text-sm",
            isWinner ? "text-ink font-semibold" : "text-muted",
          )}
        >
          {formatPoints(side.score)}
        </span>
      ) : null}
    </div>
  );
}
