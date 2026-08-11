import type {
  LineupSlot,
  MatchupType,
  PlayerPosition,
  ProviderType,
  TransactionType,
} from "@/generated/prisma/enums";

/**
 * The normalized shape every provider must produce. Nothing downstream — not
 * the sync writer, not the event engine, not the UI — knows that ESPN or Yahoo
 * exist. Adding a platform means writing one mapper to these types.
 */

export type NormalizedLeague = {
  providerLeagueId: string;
  name: string;
  seasonYear: number;
  teamCount: number;
  regularSeasonWeeks: number;
  playoffWeeks: number;
  playoffTeamCount: number;
  scoringType: string;
  currentWeek: number;
  isComplete: boolean;
  /** Seasons the provider says exist for this league, newest first. */
  availableSeasons: number[];
};

export type NormalizedMember = {
  providerMemberId: string;
  displayName: string;
  isLeagueManager: boolean;
};

export type NormalizedTeam = {
  providerTeamId: string;
  name: string;
  abbreviation: string | null;
  logoUrl: string | null;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  regularSeasonRank: number | null;
  finalRank: number | null;
  /** Provider member ids that own this team. */
  ownerIds: string[];
};

export type NormalizedPlayer = {
  providerPlayerId: string;
  fullName: string;
  position: PlayerPosition;
  nflTeam: string | null;
};

export type NormalizedLineupSlot = {
  providerPlayerId: string;
  slot: LineupSlot;
  isStarter: boolean;
  points: number;
  projectedPoints: number | null;
};

export type NormalizedMatchup = {
  /** Stable within a season: week + both provider team ids. */
  week: number;
  type: MatchupType;
  homeProviderTeamId: string;
  awayProviderTeamId: string;
  homeScore: number;
  awayScore: number;
  /** null when the game has not been played. */
  winner: "HOME" | "AWAY" | "TIE" | null;
  isComplete: boolean;
  playedOn: Date | null;
  /** Empty when the provider has not been asked for box scores. */
  homeLineup: NormalizedLineupSlot[];
  awayLineup: NormalizedLineupSlot[];
};

export type NormalizedDraftPick = {
  providerTeamId: string;
  providerPlayerId: string | null;
  round: number;
  pickInRound: number;
  overallPick: number;
  isKeeper: boolean;
  auctionAmount: number | null;
};

export type NormalizedTransaction = {
  providerTransactionId: string;
  providerTeamId: string;
  providerPlayerId: string;
  type: TransactionType;
  week: number | null;
  occurredOn: Date;
  faabSpent: number | null;
  /** Groups the legs of a trade together. */
  providerTradeId: string | null;
};

/** Everything a single season import produces. */
export type NormalizedSeason = {
  league: NormalizedLeague;
  members: NormalizedMember[];
  teams: NormalizedTeam[];
  players: NormalizedPlayer[];
  matchups: NormalizedMatchup[];
  draftPicks: NormalizedDraftPick[];
  transactions: NormalizedTransaction[];
};

export type ProviderCredentials = Record<string, string>;

export type ProviderContext = {
  providerLeagueId: string;
  credentials: ProviderCredentials;
};

export type ConnectionCheck = {
  ok: boolean;
  /** Public leagues are readable without credentials. */
  requiresCredentials: boolean;
  leagueName?: string;
  seasons?: number[];
  message: string;
};

export interface FantasyProvider {
  readonly type: ProviderType;
  readonly label: string;
  /** Credential fields this provider needs, for the admin form to render. */
  readonly credentialFields: {
    key: string;
    label: string;
    hint?: string;
    required: boolean;
  }[];

  /** Cheap reachability and auth probe. Never throws for auth failures. */
  checkConnection(ctx: ProviderContext, seasonYear: number): Promise<ConnectionCheck>;

  /** Which seasons this league has data for. */
  listSeasons(ctx: ProviderContext, hintYear: number): Promise<number[]>;

  /** Full import for one season. `withBoxScores` is expensive — one request
   *  per scoring period — so callers opt in. */
  fetchSeason(
    ctx: ProviderContext,
    seasonYear: number,
    options?: { withBoxScores?: boolean },
  ): Promise<NormalizedSeason>;
}

/** Raised for expected provider failures so the sync can log them as errors
 *  against the run rather than crashing it. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
