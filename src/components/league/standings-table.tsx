import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { StandingsRow } from "@/lib/queries/leagues";
import { cn, formatPoints, formatRecord } from "@/lib/utils";

/** Table on desktop, stacked cards on mobile. A 9-column table does not
 *  survive a 375px screen, so the small layout is a different component
 *  rather than a horizontally scrolling compromise. */
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
      <div className="border-line rounded-card hidden overflow-hidden border sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-line bg-surface-2 border-b">
              <th scope="col" className="eyebrow px-4 py-3 text-left">
                #
              </th>
              <th scope="col" className="eyebrow px-4 py-3 text-left">
                Team
              </th>
              <th scope="col" className="eyebrow px-4 py-3 text-right">
                Record
              </th>
              <th scope="col" className="eyebrow px-4 py-3 text-right">
                PF
              </th>
              <th scope="col" className="eyebrow px-4 py-3 text-right">
                PA
              </th>
              <th scope="col" className="eyebrow px-4 py-3 text-right">
                Diff
              </th>
            </tr>
          </thead>
          <tbody className="divide-line divide-y">
            {rows.map((row, index) => {
              const isMine = highlightUserId && row.manager?.id === highlightUserId;
              const diff = row.pointsFor - row.pointsAgainst;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-surface-2 transition-colors",
                    isMine && "bg-gold-wash",
                    index === playoffCutoff - 1 && "border-b-line-strong border-b-2",
                  )}
                >
                  <td className="text-subtle px-4 py-3 tabular">{row.rank ?? index + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={row.name} src={row.logoUrl} size="sm" rounded="card" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold">
                          {row.name}
                          {championTeamId === row.id ? (
                            <Trophy className="text-gold size-3.5 shrink-0" />
                          ) : null}
                        </p>
                        {row.manager ? (
                          <Link
                            href={`/profile/${row.manager.id}`}
                            className="text-subtle hover:text-muted truncate text-xs"
                          >
                            {row.manager.name}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular">
                    {formatRecord(row.wins, row.losses, row.ties)}
                  </td>
                  <td className="px-4 py-3 text-right tabular">
                    {formatPoints(row.pointsFor)}
                  </td>
                  <td className="text-muted px-4 py-3 text-right tabular">
                    {formatPoints(row.pointsAgainst)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-semibold tabular",
                      diff > 0 ? "text-field" : diff < 0 ? "text-ember" : "text-muted",
                    )}
                  >
                    {diff > 0 ? "+" : ""}
                    {formatPoints(diff)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="space-y-2 sm:hidden">
        {rows.map((row, index) => {
          const isMine = highlightUserId && row.manager?.id === highlightUserId;
          return (
            <li
              key={row.id}
              className={cn(
                "border-line bg-surface rounded-card flex items-center gap-3 border p-3",
                isMine && "border-gold/40 bg-gold-wash",
              )}
            >
              <span className="text-subtle w-5 shrink-0 text-center text-sm tabular">
                {row.rank ?? index + 1}
              </span>
              <Avatar name={row.name} src={row.logoUrl} size="sm" rounded="card" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{row.name}</p>
                <p className="text-subtle truncate text-xs">
                  {row.manager?.name ?? "Unclaimed"} · {formatPoints(row.pointsFor)} PF
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="stat-figure text-base">
                  {formatRecord(row.wins, row.losses, row.ties)}
                </p>
                {index < playoffCutoff ? (
                  <Badge tone="field" size="xs" className="mt-1">
                    Playoff
                  </Badge>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
