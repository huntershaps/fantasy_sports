import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { MatchupSummary } from "@/lib/queries/leagues";
import { cn, formatPoints } from "@/lib/utils";

const ROUND_LABEL: Record<string, string> = {
  QUARTERFINAL: "Quarterfinal",
  SEMIFINAL: "Semifinal",
  CHAMPIONSHIP: "Championship",
  THIRD_PLACE: "Third place",
  CONSOLATION: "Consolation",
};

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
        "border-line bg-surface rounded-card block overflow-hidden border transition-colors",
        "hover:border-line-strong focus-visible:border-gold",
        matchup.type === "CHAMPIONSHIP" && "border-gold/40",
        className,
      )}
    >
      <div className="border-line flex items-center justify-between border-b px-4 py-2">
        <span className="eyebrow">Week {matchup.week}</span>
        {round ? (
          <Badge tone={matchup.type === "CHAMPIONSHIP" ? "gold" : "neutral"} size="xs">
            {round}
          </Badge>
        ) : !matchup.isComplete ? (
          <Badge tone="ice" size="xs">
            Upcoming
          </Badge>
        ) : null}
      </div>

      <div className="divide-line divide-y">
        <TeamRow
          side={matchup.away}
          isWinner={matchup.winnerTeamId === matchup.away.id}
          isComplete={matchup.isComplete}
          isHighlighted={highlightTeamId === matchup.away.id}
        />
        <TeamRow
          side={matchup.home}
          isWinner={matchup.winnerTeamId === matchup.home.id}
          isComplete={matchup.isComplete}
          isHighlighted={highlightTeamId === matchup.home.id}
        />
      </div>
    </Link>
  );
}

function TeamRow({
  side,
  isWinner,
  isComplete,
  isHighlighted,
}: {
  side: MatchupSummary["home"];
  isWinner: boolean;
  isComplete: boolean;
  isHighlighted: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3",
        isHighlighted && "bg-gold-wash",
        // Losers recede rather than being marked, which keeps the grid calm.
        isComplete && !isWinner && "opacity-55",
      )}
    >
      <Avatar name={side.name} src={side.logoUrl} size="sm" rounded="card" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{side.name}</p>
        {side.manager ? (
          <p className="text-subtle truncate text-xs">{side.manager.name}</p>
        ) : null}
      </div>
      {isComplete ? (
        <span
          className={cn(
            "stat-figure text-lg tabular",
            isWinner ? "text-ink" : "text-muted",
          )}
        >
          {formatPoints(side.score)}
        </span>
      ) : (
        <span className="text-subtle text-sm">—</span>
      )}
    </div>
  );
}
