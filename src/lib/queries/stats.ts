import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Headline counts for the signed-out pages.
 *
 * These are read from the database rather than written by hand. The sign-in
 * page previously carried invented figures ("8 seasons", "1,482 matchups")
 * with no framing to mark them as illustrative, sitting beside a real archive
 * — a signed-out visitor had no way to tell they were decoration.
 *
 * Every league is counted, public or not. These are counts and nothing else —
 * no names, no scores, no league identities — so they disclose only how much
 * this archive holds, which is the question the page is answering. Restricting
 * them to public leagues was the first instinct, but with a private archive it
 * renders a row of zeros or nothing at all, which is worse than honest.
 *
 * If that ever stops being the right trade, scope each count with
 * `league: { isPublic: true }` and the pages fall back to hiding the block.
 */
export const getPublicArchiveStats = cache(async () => {
  const [leagues, seasons, matchups, trades, records] = await Promise.all([
    db.league.count(),
    db.season.count(),
    db.matchup.count({ where: { isComplete: true } }),
    db.rosterTransaction.count({ where: { type: "TRADE" } }),
    db.leagueRecord.count({ where: { isCurrent: true } }),
  ]);

  return { leagues, seasons, matchups, trades, records };
});

/** Thousands separators, so 1482 reads as 1,482 in a headline figure. */
export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}
