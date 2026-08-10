-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "LeagueRole" AS ENUM ('MEMBER', 'COMMISSIONER');

-- CreateEnum
CREATE TYPE "ProviderType" AS ENUM ('ESPN', 'YAHOO', 'SLEEPER', 'NFL', 'MANUAL');

-- CreateEnum
CREATE TYPE "SeasonStatus" AS ENUM ('UPCOMING', 'IN_PROGRESS', 'COMPLETE');

-- CreateEnum
CREATE TYPE "MatchupType" AS ENUM ('REGULAR', 'PLAYOFF', 'QUARTERFINAL', 'SEMIFINAL', 'CHAMPIONSHIP', 'THIRD_PLACE', 'CONSOLATION', 'BYE');

-- CreateEnum
CREATE TYPE "LineupSlot" AS ENUM ('QB', 'RB', 'WR', 'TE', 'FLEX', 'SUPER_FLEX', 'K', 'DST', 'DL', 'LB', 'DB', 'BENCH', 'IR');

-- CreateEnum
CREATE TYPE "PlayerPosition" AS ENUM ('QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DL', 'LB', 'DB', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DRAFT', 'TRADE', 'WAIVER_ADD', 'FREE_AGENT_ADD', 'DROP', 'IR_PLACE', 'IR_ACTIVATE', 'COMMISSIONER');

-- CreateEnum
CREATE TYPE "AwardTier" AS ENUM ('LEGENDARY', 'GOLD', 'SILVER', 'BRONZE', 'SHAME', 'FUN');

-- CreateEnum
CREATE TYPE "AwardScope" AS ENUM ('WEEK', 'SEASON', 'CAREER', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('MATCHUP', 'TRADE', 'WAIVER', 'DROP', 'DRAFT', 'RECORD', 'CHAMPIONSHIP', 'PLAYER_PERFORMANCE', 'MILESTONE', 'STREAK', 'RIVALRY');

-- CreateEnum
CREATE TYPE "SubjectRole" AS ENUM ('PRIMARY', 'OPPONENT', 'PARTICIPANT', 'MENTIONED');

-- CreateEnum
CREATE TYPE "RecordCategory" AS ENUM ('TEAM', 'PLAYER', 'MANAGER');

-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('PROVIDER', 'AUTO', 'MANUAL', 'SEED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncMode" AS ENUM ('FULL', 'INCREMENTAL', 'HISTORICAL');

-- CreateEnum
CREATE TYPE "SyncSeverity" AS ENUM ('WARNING', 'ERROR', 'FATAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "image" TEXT,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "isDisabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "accentColor" TEXT NOT NULL DEFAULT '#F5C518',
    "secondColor" TEXT NOT NULL DEFAULT '#0B7A75',
    "foundedYear" INTEGER NOT NULL,
    "provider" "ProviderType" NOT NULL DEFAULT 'MANUAL',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueSettings" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "scoringType" TEXT NOT NULL DEFAULT 'PPR',
    "teamCount" INTEGER NOT NULL DEFAULT 10,
    "playoffTeamCount" INTEGER NOT NULL DEFAULT 6,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "playoffWeeks" INTEGER NOT NULL DEFAULT 3,
    "tradeDeadlineWeek" INTEGER,
    "faabBudget" INTEGER,
    "rosterSlots" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "LeagueSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "role" "LeagueRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeagueMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "SeasonStatus" NOT NULL DEFAULT 'UPCOMING',
    "currentWeek" INTEGER NOT NULL DEFAULT 1,
    "regularSeasonWeeks" INTEGER NOT NULL DEFAULT 14,
    "playoffWeeks" INTEGER NOT NULL DEFAULT 3,
    "championTeamId" TEXT,
    "runnerUpTeamId" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Franchise" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "providerFranchiseId" TEXT,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Franchise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FantasyTeam" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "franchiseId" TEXT,
    "providerTeamId" TEXT,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "logoUrl" TEXT,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "ties" INTEGER NOT NULL DEFAULT 0,
    "pointsFor" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "pointsAgainst" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "regularSeasonRank" INTEGER,
    "finalRank" INTEGER,
    "madePlayoffs" BOOLEAN NOT NULL DEFAULT false,
    "source" "ContentSource" NOT NULL DEFAULT 'PROVIDER',
    "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FantasyTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "providerPlayerId" TEXT,
    "provider" "ProviderType" NOT NULL DEFAULT 'MANUAL',
    "fullName" TEXT NOT NULL,
    "position" "PlayerPosition" NOT NULL DEFAULT 'UNKNOWN',
    "nflTeam" TEXT,
    "headshotUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Matchup" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "week" INTEGER NOT NULL,
    "type" "MatchupType" NOT NULL DEFAULT 'REGULAR',
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "awayScore" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "winnerTeamId" TEXT,
    "isTie" BOOLEAN NOT NULL DEFAULT false,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "playedOn" TIMESTAMP(3),
    "source" "ContentSource" NOT NULL DEFAULT 'PROVIDER',
    "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Matchup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchupPlayer" (
    "id" TEXT NOT NULL,
    "matchupId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "slot" "LineupSlot" NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT true,
    "points" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "projectedPoints" DECIMAL(10,2),

    CONSTRAINT "MatchupPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterTransaction" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "week" INTEGER,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "faabSpent" INTEGER,
    "waiverPriority" INTEGER,
    "tradeId" TEXT,
    "notes" TEXT,
    "providerTxnId" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'PROVIDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "week" INTEGER,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "providerTradeId" TEXT,
    "notes" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'PROVIDER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeItem" (
    "id" TEXT NOT NULL,
    "tradeId" TEXT NOT NULL,
    "fromTeamId" TEXT NOT NULL,
    "toTeamId" TEXT NOT NULL,
    "playerId" TEXT,
    "draftPickId" TEXT,
    "faabAmount" INTEGER,

    CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DraftPick" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "fantasyTeamId" TEXT NOT NULL,
    "playerId" TEXT,
    "round" INTEGER NOT NULL,
    "pickInRound" INTEGER NOT NULL,
    "overallPick" INTEGER NOT NULL,
    "isKeeper" BOOLEAN NOT NULL DEFAULT false,
    "auctionAmount" INTEGER,
    "occurredOn" TIMESTAMP(3),

    CONSTRAINT "DraftPick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AwardDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "leagueId" TEXT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tier" "AwardTier" NOT NULL DEFAULT 'GOLD',
    "scope" "AwardScope" NOT NULL DEFAULT 'SEASON',
    "accentColor" TEXT NOT NULL DEFAULT '#F5C518',
    "isBuiltIn" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "grantsCertificate" BOOLEAN NOT NULL DEFAULT false,
    "certificateTemplate" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AwardDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "week" INTEGER,
    "userId" TEXT,
    "fantasyTeamId" TEXT,
    "playerId" TEXT,
    "matchupId" TEXT,
    "titleOverride" TEXT,
    "description" TEXT,
    "stats" JSONB NOT NULL DEFAULT '{}',
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "source" "ContentSource" NOT NULL DEFAULT 'AUTO',
    "dedupeKey" TEXT,
    "awardedOn" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "awardId" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "template" TEXT NOT NULL DEFAULT 'classic',
    "recipientName" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "leagueName" TEXT NOT NULL,
    "seasonLabel" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "issuedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "seasonId" TEXT,
    "week" INTEGER,
    "type" "MemoryType" NOT NULL,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "template" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "headline" TEXT NOT NULL,
    "body" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 50,
    "imageUrl" TEXT,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "source" "ContentSource" NOT NULL DEFAULT 'AUTO',
    "dedupeKey" TEXT,
    "matchupId" TEXT,
    "tradeId" TEXT,
    "transactionId" TEXT,
    "recordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorySubject" (
    "id" TEXT NOT NULL,
    "memoryId" TEXT NOT NULL,
    "userId" TEXT,
    "fantasyTeamId" TEXT,
    "role" "SubjectRole" NOT NULL DEFAULT 'PARTICIPANT',

    CONSTRAINT "MemorySubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeagueRecord" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "category" "RecordCategory" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "displayValue" TEXT NOT NULL,
    "description" TEXT,
    "seasonId" TEXT,
    "week" INTEGER,
    "matchupId" TEXT,
    "holderUserId" TEXT,
    "holderTeamId" TEXT,
    "holderPlayerId" TEXT,
    "occurredOn" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "previousRecordId" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'AUTO',
    "lockedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeagueRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "providerLeagueId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSync" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "provider" "ProviderType" NOT NULL,
    "mode" "SyncMode" NOT NULL DEFAULT 'INCREMENTAL',
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "seasonYears" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "memoriesCreated" INTEGER NOT NULL DEFAULT 0,
    "awardsCreated" INTEGER NOT NULL DEFAULT 0,
    "leagueRecordsSet" INTEGER NOT NULL DEFAULT 0,
    "triggeredByUserId" TEXT,
    "summary" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "DataSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSyncError" (
    "id" TEXT NOT NULL,
    "dataSyncId" TEXT NOT NULL,
    "severity" "SyncSeverity" NOT NULL DEFAULT 'ERROR',
    "entity" TEXT NOT NULL,
    "entityRef" TEXT,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataSyncError_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE INDEX "League_isArchived_idx" ON "League"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueSettings_leagueId_key" ON "LeagueSettings"("leagueId");

-- CreateIndex
CREATE INDEX "LeagueMembership_leagueId_idx" ON "LeagueMembership"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueMembership_userId_leagueId_key" ON "LeagueMembership"("userId", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_championTeamId_key" ON "Season"("championTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Season_runnerUpTeamId_key" ON "Season"("runnerUpTeamId");

-- CreateIndex
CREATE INDEX "Season_leagueId_year_idx" ON "Season"("leagueId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Season_leagueId_year_key" ON "Season"("leagueId", "year");

-- CreateIndex
CREATE INDEX "Franchise_leagueId_idx" ON "Franchise"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Franchise_leagueId_providerFranchiseId_key" ON "Franchise"("leagueId", "providerFranchiseId");

-- CreateIndex
CREATE INDEX "FantasyTeam_seasonId_idx" ON "FantasyTeam"("seasonId");

-- CreateIndex
CREATE INDEX "FantasyTeam_franchiseId_idx" ON "FantasyTeam"("franchiseId");

-- CreateIndex
CREATE UNIQUE INDEX "FantasyTeam_seasonId_providerTeamId_key" ON "FantasyTeam"("seasonId", "providerTeamId");

-- CreateIndex
CREATE INDEX "TeamMembership_fantasyTeamId_idx" ON "TeamMembership"("fantasyTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMembership_userId_fantasyTeamId_key" ON "TeamMembership"("userId", "fantasyTeamId");

-- CreateIndex
CREATE INDEX "Player_fullName_idx" ON "Player"("fullName");

-- CreateIndex
CREATE INDEX "Player_position_idx" ON "Player"("position");

-- CreateIndex
CREATE UNIQUE INDEX "Player_provider_providerPlayerId_key" ON "Player"("provider", "providerPlayerId");

-- CreateIndex
CREATE INDEX "Matchup_seasonId_week_idx" ON "Matchup"("seasonId", "week");

-- CreateIndex
CREATE INDEX "Matchup_playedOn_idx" ON "Matchup"("playedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Matchup_seasonId_week_homeTeamId_awayTeamId_key" ON "Matchup"("seasonId", "week", "homeTeamId", "awayTeamId");

-- CreateIndex
CREATE INDEX "MatchupPlayer_matchupId_idx" ON "MatchupPlayer"("matchupId");

-- CreateIndex
CREATE INDEX "MatchupPlayer_playerId_idx" ON "MatchupPlayer"("playerId");

-- CreateIndex
CREATE INDEX "MatchupPlayer_points_idx" ON "MatchupPlayer"("points");

-- CreateIndex
CREATE UNIQUE INDEX "MatchupPlayer_matchupId_fantasyTeamId_playerId_key" ON "MatchupPlayer"("matchupId", "fantasyTeamId", "playerId");

-- CreateIndex
CREATE INDEX "RosterTransaction_seasonId_occurredOn_idx" ON "RosterTransaction"("seasonId", "occurredOn");

-- CreateIndex
CREATE INDEX "RosterTransaction_fantasyTeamId_idx" ON "RosterTransaction"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "RosterTransaction_playerId_idx" ON "RosterTransaction"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterTransaction_seasonId_providerTxnId_playerId_type_key" ON "RosterTransaction"("seasonId", "providerTxnId", "playerId", "type");

-- CreateIndex
CREATE INDEX "Trade_seasonId_occurredOn_idx" ON "Trade"("seasonId", "occurredOn");

-- CreateIndex
CREATE UNIQUE INDEX "Trade_seasonId_providerTradeId_key" ON "Trade"("seasonId", "providerTradeId");

-- CreateIndex
CREATE INDEX "TradeItem_tradeId_idx" ON "TradeItem"("tradeId");

-- CreateIndex
CREATE INDEX "DraftPick_seasonId_idx" ON "DraftPick"("seasonId");

-- CreateIndex
CREATE INDEX "DraftPick_fantasyTeamId_idx" ON "DraftPick"("fantasyTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "DraftPick_seasonId_overallPick_key" ON "DraftPick"("seasonId", "overallPick");

-- CreateIndex
CREATE INDEX "AwardDefinition_leagueId_idx" ON "AwardDefinition"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "AwardDefinition_key_leagueId_key" ON "AwardDefinition"("key", "leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "Award_dedupeKey_key" ON "Award"("dedupeKey");

-- CreateIndex
CREATE INDEX "Award_leagueId_seasonId_idx" ON "Award"("leagueId", "seasonId");

-- CreateIndex
CREATE INDEX "Award_userId_idx" ON "Award"("userId");

-- CreateIndex
CREATE INDEX "Award_fantasyTeamId_idx" ON "Award"("fantasyTeamId");

-- CreateIndex
CREATE INDEX "Award_awardedOn_idx" ON "Award"("awardedOn");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_awardId_key" ON "Certificate"("awardId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_serialNumber_key" ON "Certificate"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Memory_dedupeKey_key" ON "Memory"("dedupeKey");

-- CreateIndex
CREATE INDEX "Memory_leagueId_occurredOn_idx" ON "Memory"("leagueId", "occurredOn");

-- CreateIndex
CREATE INDEX "Memory_type_idx" ON "Memory"("type");

-- CreateIndex
CREATE INDEX "Memory_importance_idx" ON "Memory"("importance");

-- CreateIndex
CREATE INDEX "MemorySubject_userId_idx" ON "MemorySubject"("userId");

-- CreateIndex
CREATE INDEX "MemorySubject_fantasyTeamId_idx" ON "MemorySubject"("fantasyTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "MemorySubject_memoryId_userId_fantasyTeamId_role_key" ON "MemorySubject"("memoryId", "userId", "fantasyTeamId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "LeagueRecord_previousRecordId_key" ON "LeagueRecord"("previousRecordId");

-- CreateIndex
CREATE INDEX "LeagueRecord_leagueId_key_isCurrent_idx" ON "LeagueRecord"("leagueId", "key", "isCurrent");

-- CreateIndex
CREATE INDEX "LeagueRecord_category_idx" ON "LeagueRecord"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_leagueId_key" ON "ProviderCredential"("leagueId");

-- CreateIndex
CREATE INDEX "DataSync_leagueId_startedAt_idx" ON "DataSync"("leagueId", "startedAt");

-- CreateIndex
CREATE INDEX "DataSyncError_dataSyncId_idx" ON "DataSyncError"("dataSyncId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueSettings" ADD CONSTRAINT "LeagueSettings_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueMembership" ADD CONSTRAINT "LeagueMembership_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_championTeamId_fkey" FOREIGN KEY ("championTeamId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_runnerUpTeamId_fkey" FOREIGN KEY ("runnerUpTeamId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franchise" ADD CONSTRAINT "Franchise_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FantasyTeam" ADD CONSTRAINT "FantasyTeam_franchiseId_fkey" FOREIGN KEY ("franchiseId") REFERENCES "Franchise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMembership" ADD CONSTRAINT "TeamMembership_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchup" ADD CONSTRAINT "Matchup_winnerTeamId_fkey" FOREIGN KEY ("winnerTeamId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupPlayer" ADD CONSTRAINT "MatchupPlayer_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupPlayer" ADD CONSTRAINT "MatchupPlayer_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchupPlayer" ADD CONSTRAINT "MatchupPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterTransaction" ADD CONSTRAINT "RosterTransaction_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trade" ADD CONSTRAINT "Trade_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeItem" ADD CONSTRAINT "TradeItem_draftPickId_fkey" FOREIGN KEY ("draftPickId") REFERENCES "DraftPick"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DraftPick" ADD CONSTRAINT "DraftPick_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AwardDefinition" ADD CONSTRAINT "AwardDefinition_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "AwardDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_awardId_fkey" FOREIGN KEY ("awardId") REFERENCES "Award"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "RosterTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "LeagueRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySubject" ADD CONSTRAINT "MemorySubject_memoryId_fkey" FOREIGN KEY ("memoryId") REFERENCES "Memory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySubject" ADD CONSTRAINT "MemorySubject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorySubject" ADD CONSTRAINT "MemorySubject_fantasyTeamId_fkey" FOREIGN KEY ("fantasyTeamId") REFERENCES "FantasyTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_matchupId_fkey" FOREIGN KEY ("matchupId") REFERENCES "Matchup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_holderUserId_fkey" FOREIGN KEY ("holderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_holderTeamId_fkey" FOREIGN KEY ("holderTeamId") REFERENCES "FantasyTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_holderPlayerId_fkey" FOREIGN KEY ("holderPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeagueRecord" ADD CONSTRAINT "LeagueRecord_previousRecordId_fkey" FOREIGN KEY ("previousRecordId") REFERENCES "LeagueRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSync" ADD CONSTRAINT "DataSync_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSync" ADD CONSTRAINT "DataSync_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSyncError" ADD CONSTRAINT "DataSyncError_dataSyncId_fkey" FOREIGN KEY ("dataSyncId") REFERENCES "DataSync"("id") ON DELETE CASCADE ON UPDATE CASCADE;
