/** Structural types for the slices of ESPN's v3 payload we actually read.
 *  Everything is optional because ESPN omits whole branches depending on which
 *  `view` parameters were requested and how far along the season is. */

export type EspnMember = {
  id?: string;
  displayName?: string;
  isLeagueManager?: boolean;
};

export type EspnRosterEntry = {
  lineupSlotId?: number;
  playerId?: number;
  playerPoolEntry?: {
    appliedStatTotal?: number;
    player?: EspnPlayer;
  };
};

export type EspnPlayer = {
  id?: number;
  fullName?: string;
  defaultPositionId?: number;
  proTeamId?: number;
  stats?: {
    scoringPeriodId?: number;
    statSourceId?: number;
    statSplitTypeId?: number;
    appliedTotal?: number;
  }[];
};

export type EspnTeam = {
  id?: number;
  abbrev?: string;
  name?: string;
  location?: string;
  nickname?: string;
  logo?: string;
  owners?: string[];
  primaryOwner?: string;
  playoffSeed?: number;
  rankCalculatedFinal?: number;
  record?: {
    overall?: {
      wins?: number;
      losses?: number;
      ties?: number;
      pointsFor?: number;
      pointsAgainst?: number;
    };
  };
  roster?: { entries?: EspnRosterEntry[] };
};

export type EspnMatchupSide = {
  teamId?: number;
  totalPoints?: number;
  rosterForCurrentScoringPeriod?: { entries?: EspnRosterEntry[] };
  rosterForMatchupPeriod?: { entries?: EspnRosterEntry[] };
};

export type EspnScheduleItem = {
  id?: number;
  matchupPeriodId?: number;
  playoffTierType?: string;
  winner?: string;
  home?: EspnMatchupSide;
  away?: EspnMatchupSide;
};

export type EspnDraftPick = {
  teamId?: number;
  playerId?: number;
  roundId?: number;
  roundPickNumber?: number;
  overallPickNumber?: number;
  keeper?: boolean;
  bidAmount?: number;
};

export type EspnTransactionItem = {
  type?: string;
  playerId?: number;
  toTeamId?: number;
  fromTeamId?: number;
};

export type EspnTransaction = {
  id?: string;
  type?: string;
  status?: string;
  executionType?: string;
  proposedDate?: number;
  scoringPeriodId?: number;
  teamId?: number;
  bidAmount?: number;
  items?: EspnTransactionItem[];
};

export type EspnLeaguePayload = {
  id?: number;
  seasonId?: number;
  members?: EspnMember[];
  teams?: EspnTeam[];
  schedule?: EspnScheduleItem[];
  draftDetail?: { drafted?: boolean; inProgress?: boolean; picks?: EspnDraftPick[] };
  transactions?: EspnTransaction[];
  status?: {
    currentMatchupPeriod?: number;
    latestScoringPeriod?: number;
    finalScoringPeriod?: number;
    isActive?: boolean;
    previousSeasons?: number[];
    seasonId?: number;
  };
  settings?: {
    name?: string;
    size?: number;
    scoringSettings?: { scoringType?: string };
    scheduleSettings?: {
      matchupPeriodCount?: number;
      playoffTeamCount?: number;
      playoffMatchupPeriodLength?: number;
    };
  };
};
