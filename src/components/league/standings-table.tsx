import Link from "next/link";
import { Trophy } from "lucide-react";
import { Crest } from "@/components/ui/crest";
import type { StandingsRow } from "@/lib/queries/leagues";
import { cn, formatPoints, formatRecord } from "@/lib/utils";

/** Dense table on desktop; a compact list on mobile. Not a scaled-down table —
 *  the small layout drops points-against and diff, which nobody reads on a
 *  phone, and keeps rank, team, record and PF. */
export function StandingsTable({
  rows,
  playoffCutoff = 6,
  highlightUserId,
  championTeamId,
}: {
  rows: StandingsRow[];
  playoffCutoff?: number;
  highlightUserId?: string | null;
  championTeamId?: string | null;
}) {
  return (
    <>
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-line border-b">
            <th scope="col" className="label w-8 py-2 text-left font-semibold">
              #
            </th>
            <th scope="col" className="label py-2 text-left font-semibold">
              Team
            </th>
            <th scope="col" className="label w-16 py-2 text-right font-semibold">
              W-L
            </th>
            <th scope="col" className="label w-24 py-2 text-right font-semibold">
              PF
            </th>
            <th scope="col" className="label w-24 py-2 text-right font-semibold">
              PA
            </th>
            <th scope="col" className="label w-20 py-2 text-right font-semibold">
              Diff
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isMine = highlightUserId && row.manager?.id === highlightUserId;
            const diff = row.pointsFor - row.pointsAgainst;
            return (
              <tr
                key={row.id}
                className={cn(
                  "border-line hover:bg-surface border-b transition-colors",
                  isMine && "bg-brand-dim/12",
                  index === playoffCutoff - 1 && "border-b-line-strong",
                )}
              >
                <td className="text-faint tnum py-2.5">{row.rank || index + 1}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <Crest name={row.name} src={row.logoUrl} size="sm" shape="round" />
                    <span className="text-ink truncate font-medium">{row.name}</span>
                    {championTeamId === row.id ? (
                      <Trophy className="text-brand size-3 shrink-0 self-center" />
                    ) : null}
                    {row.manager ? (
                      <Link
                        href={`/profile/${row.manager.id}`}
                        className="text-faint hover:text-muted truncate text-xs"
                      >
                        {row.manager.name}
                      </Link>
                    ) : null}
                  </div>
                </td>
                <td className="tnum py-2.5 text-right font-medium">
                  {formatRecord(row.wins, row.losses, row.ties)}
                </td>
                <td className="tnum py-2.5 text-right">{formatPoints(row.pointsFor)}</td>
                <td className="tnum text-muted py-2.5 text-right">
                  {formatPoints(row.pointsAgainst)}
                </td>
                <td
                  className={cn(
                    "tnum py-2.5 text-right",
                    diff > 0 ? "text-win" : diff < 0 ? "text-loss" : "text-muted",
                  )}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <ul className="border-line divide-line divide-y border-t sm:hidden">
        {rows.map((row, index) => {
          const isMine = highlightUserId && row.manager?.id === highlightUserId;
          const rank = row.rank || index + 1;
          return (
            <li
              key={row.id}
              className={cn(
                "flex items-center gap-3 py-2.5",
                isMine && "bg-brand-dim/12 -mx-4 px-4",
              )}
            >
              <span
                className={cn(
                  "tnum w-5 shrink-0 text-center text-xs",
                  rank <= playoffCutoff ? "text-ink font-medium" : "text-faint",
                )}
              >
                {rank}
              </span>
              <Crest name={row.name} src={row.logoUrl} size="md" shape="round" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-faint truncate text-xs">
                  {/* The abbreviation is what survives when a long team name
                      truncates on a narrow screen, so it leads here. */}
                  {row.abbreviation ? (
                    <span className="text-muted font-medium">{row.abbreviation}</span>
                  ) : null}
                  {row.abbreviation && row.manager ? " · " : null}
                  {row.manager?.name ?? (row.abbreviation ? null : "Unclaimed")}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tnum text-sm font-medium">
                  {formatRecord(row.wins, row.losses, row.ties)}
                </p>
                <p className="tnum text-faint text-xs">{formatPoints(row.pointsFor)}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
