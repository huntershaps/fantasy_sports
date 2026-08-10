import { formatPoints } from "@/lib/utils";

/** A memory stores structured data, never finished prose. The same row renders
 *  as "You beat Noah" or "Noah beat you" depending on who is reading it, which
 *  is only possible because personalization happens here at display time. */

export type MemoryParty = {
  teamId: string | null;
  teamName: string;
  userId: string | null;
  managerName: string;
};

export type RenderableMemory = {
  template: string;
  data: unknown;
  headline: string;
  body?: string | null;
  week?: number | null;
};

export type RenderedMemory = {
  /** Personalized one-liner. */
  text: string;
  /** Supporting line, when the template has one. */
  detail?: string;
  /** True when the viewer is one of the subjects — drives "your history" styling. */
  isPersonal: boolean;
};

type Data = Record<string, unknown>;

/** Records where a new mark is an embarrassment rather than an achievement. */
const UNWANTED_RECORDS = new Set([
  "lowest_team_score",
  "fewest_points_season",
  "longest_loss_streak",
]);

const asData = (value: unknown): Data =>
  value && typeof value === "object" ? (value as Data) : {};

function party(value: unknown): MemoryParty {
  const d = asData(value);
  return {
    teamId: (d.teamId as string) ?? null,
    teamName: (d.teamName as string) ?? "Unknown team",
    userId: (d.userId as string) ?? null,
    managerName: (d.managerName as string) ?? "an unknown manager",
  };
}

/** Second person for the viewer, third person for everyone else. */
function who(p: MemoryParty, viewerId: string | null, capital = false): string {
  if (viewerId && p.userId === viewerId) return capital ? "You" : "you";
  return p.managerName;
}

function possessive(p: MemoryParty, viewerId: string | null, capital = false): string {
  if (viewerId && p.userId === viewerId) return capital ? "Your" : "your";
  return `${p.managerName}'s`;
}

export function renderMemory(
  memory: RenderableMemory,
  viewerUserId: string | null,
): RenderedMemory {
  const d = asData(memory.data);
  const fallback: RenderedMemory = { text: memory.headline, detail: memory.body ?? undefined, isPersonal: false };

  switch (memory.template) {
    case "championship": {
      const winner = party(d.winner);
      const loser = party(d.loser);
      const personal = involves(viewerUserId, winner, loser);
      return {
        text: `${who(winner, viewerUserId, true)} won the ${d.year} championship, beating ${who(loser, viewerUserId)} ${formatPoints(d.winnerScore as number)}–${formatPoints(d.loserScore as number)}.`,
        detail: `${winner.teamName} over ${loser.teamName}`,
        isPersonal: personal,
      };
    }

    case "blowout": {
      const winner = party(d.winner);
      const loser = party(d.loser);
      return {
        text: `${who(winner, viewerUserId, true)} buried ${who(loser, viewerUserId)} ${formatPoints(d.winnerScore as number)}–${formatPoints(d.loserScore as number)}.`,
        detail: `Week ${d.week}, ${d.year} · ${formatPoints(d.margin as number)} point margin`,
        isPersonal: involves(viewerUserId, winner, loser),
      };
    }

    case "nailbiter": {
      const winner = party(d.winner);
      const loser = party(d.loser);
      return {
        text: `${who(winner, viewerUserId, true)} survived ${who(loser, viewerUserId)} by ${formatPoints(d.margin as number)}.`,
        detail: `Week ${d.week}, ${d.year} · ${formatPoints(d.winnerScore as number)}–${formatPoints(d.loserScore as number)}`,
        isPersonal: involves(viewerUserId, winner, loser),
      };
    }

    case "matchup_result": {
      const winner = party(d.winner);
      const loser = party(d.loser);
      return {
        text: `${who(winner, viewerUserId, true)} defeated ${who(loser, viewerUserId)} ${formatPoints(d.winnerScore as number)}–${formatPoints(d.loserScore as number)}.`,
        detail: `Week ${d.week}, ${d.year}`,
        isPersonal: involves(viewerUserId, winner, loser),
      };
    }

    case "player_explosion": {
      const team = party(d.team);
      return {
        text: `${d.playerName} put up ${formatPoints(d.points as number)} for ${possessive(team, viewerUserId)} team.`,
        detail: `Week ${d.week}, ${d.year}`,
        isPersonal: involves(viewerUserId, team),
      };
    }

    case "trade": {
      const parties = Array.isArray(d.parties) ? d.parties.map(party) : [];
      const enriched = Array.isArray(d.parties) ? (d.parties as Data[]) : [];
      if (parties.length < 2) return fallback;

      const [a, b] = parties;
      const sentA = (enriched[0]?.sent as string[]) ?? [];
      const sentB = (enriched[1]?.sent as string[]) ?? [];
      return {
        text: `${who(a, viewerUserId, true)} traded ${list(sentA)} to ${who(b, viewerUserId)} for ${list(sentB)}.`,
        detail: d.week ? `Week ${d.week}, ${d.year}` : `${d.year}`,
        isPersonal: involves(viewerUserId, a, b),
      };
    }

    case "waiver_add": {
      const team = party(d.team);
      const faab = d.faab as number | null;
      return {
        text: `${who(team, viewerUserId, true)} picked up ${d.playerName}${faab ? ` for $${faab}` : ""}.`,
        detail: `Week ${d.week}, ${d.year}`,
        isPersonal: involves(viewerUserId, team),
      };
    }

    case "player_drop": {
      const team = party(d.team);
      return {
        text: `${who(team, viewerUserId, true)} dropped ${d.playerName}.`,
        detail: `Week ${d.week}, ${d.year}`,
        isPersonal: involves(viewerUserId, team),
      };
    }

    case "draft_pick": {
      const team = party(d.team);
      return {
        text: `${who(team, viewerUserId, true)} selected ${d.playerName} with pick ${d.overallPick}.`,
        detail: `Round ${d.round}, ${d.year} draft`,
        isPersonal: involves(viewerUserId, team),
      };
    }

    case "record_broken": {
      const team = party(d.team);
      const key = d.recordKey as string;
      const subject = `${possessive(team, viewerUserId, true)} ${d.displayValue}`;
      // "Broke the record" is wrong for marks nobody wants to hold.
      const text = UNWANTED_RECORDS.has(key)
        ? `${subject} set a new league low for ${lower(d.recordLabel as string)}.`
        : `${subject} broke the league record for ${lower(d.recordLabel as string)}.`;
      return {
        text,
        detail: `Previous mark: ${d.previousValue}`,
        isPersonal: involves(viewerUserId, team),
      };
    }

    default:
      return fallback;
  }
}

function involves(viewerId: string | null, ...parties: MemoryParty[]): boolean {
  if (!viewerId) return false;
  return parties.some((p) => p.userId === viewerId);
}

function list(items: string[]): string {
  if (items.length === 0) return "a draft pick";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

function lower(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
