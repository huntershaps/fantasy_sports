/**
 * Name handling for pages anyone can read.
 *
 * The public archive is shareable with people outside the league, so the full
 * names of real managers never leave the signed-in app. A manager is shown by
 * first name, with just enough of the surname appended to tell two managers
 * apart when they share one.
 *
 * Disambiguation is computed across the whole league rather than one season,
 * so a manager's public name does not change from year to year depending on
 * who else happened to be in that season.
 */

/** Split a stored name into a first token and whatever follows it. */
function parts(fullName: string): { first: string; surname: string } {
  const cleaned = fullName.trim().replace(/\s+/g, " ");
  if (!cleaned) return { first: "", surname: "" };
  const [first, ...rest] = cleaned.split(" ");
  return { first, surname: rest.join(" ") };
}

/**
 * Map every full name to its public form.
 *
 * Returns a Map keyed by the original name so callers can look up a row's
 * manager without re-deriving anything.
 */
export function publicManagerNames(fullNames: readonly string[]): Map<string, string> {
  const unique = [...new Set(fullNames.filter((n) => n && n.trim()))];
  const result = new Map<string, string>();

  // Group by first name, case-insensitively — "Liam" and "liam" collide.
  const groups = new Map<string, string[]>();
  for (const name of unique) {
    const { first } = parts(name);
    const key = first.toLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), name]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.set(group[0], parts(group[0]).first);
      continue;
    }

    // Shared first name: reveal the shortest surname prefix that separates
    // everyone in the group. One letter is almost always enough, but two
    // managers called "John S…" need a second.
    const longest = Math.max(...group.map((n) => parts(n).surname.length));
    let chosen: Map<string, string> | null = null;

    for (let len = 1; len <= longest; len++) {
      const attempt = new Map<string, string>();
      for (const name of group) {
        const { first, surname } = parts(name);
        attempt.set(name, surname ? `${first} ${surname.slice(0, len)}.` : first);
      }
      if (new Set(attempt.values()).size === group.length) {
        chosen = attempt;
        break;
      }
    }

    // Nothing separates them — two managers with the same recorded name, or
    // no surname to draw on. Showing the first name alone is still correct;
    // it just does not distinguish them, which no amount of initials would.
    if (!chosen) {
      chosen = new Map(group.map((name) => [name, parts(name).first]));
    }

    for (const [name, display] of chosen) result.set(name, display);
  }

  return result;
}

/** Convenience for a single name when the league's other names are known. */
export function publicManagerName(
  fullName: string | null | undefined,
  leagueNames: readonly string[],
): string | null {
  if (!fullName?.trim()) return null;
  return publicManagerNames(leagueNames).get(fullName) ?? parts(fullName).first;
}
