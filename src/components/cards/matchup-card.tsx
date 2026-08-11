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

/** Two lines, aligned scores, winner carried by weight rather than colour.
 *  Reads as a results table entry, which is what it is. */
export function MatchupCard({
  matchup,
  highlightTeamId,
  className,
}: {
  matchup: MatchupSummary;
  highlightTeamId?: string | null;
  className?: string;
}) {
  const round = ROUND_LABEL[matchup.type];

  return (
    <Link
      href={`/matchup/${matchup.id}`}
      className={cn(
        "border-line hover:border-line-strong hover:bg-surface block rounded-md border px-3.5 py-3 transition-colors",
        matchup.type === "CHAMPIONSHIP" && "border-brand/35",
        className,
      )}
    >
      <div className="text-faint mb-2 flex items-baseline justify-between gap-2 text-xs">
        <span className="label">Week {matchup.week}</span>
        {round ? (
          <span className={cn(matchup.type === "CHAMPIONSHIP" && "text-brand")}>
            {round}
          </span>
        ) : !matchup.isComplete ? (
          <span>Upcoming</span>
        ) : null}
      </div>

      <TeamLine
        side={matchup.away}
        isWinner={matchup.winnerTeamId === matchup.away.id}
        isComplete={matchup.isComplete}
        isMine={highlightTeamId === matchup.away.id}
      />
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
      <span
        className={cn(
          "tnum shrink-0 text-sm",
          isComplete && isWinner ? "text-ink font-semibold" : "text-muted",
        )}
      >
        {isComplete ? formatPoints(side.score) : "—"}
      </span>
    </div>
  );
}
