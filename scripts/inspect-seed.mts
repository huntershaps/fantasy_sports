import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const season = await db.season.findFirst({
  where: { year: 2024, league: { slug: "the-founders-league" } },
  include: {
    champion: { select: { name: true } },
    runnerUp: { select: { name: true } },
    teams: {
      orderBy: { regularSeasonRank: "asc" },
      include: { memberships: { include: { user: { select: { name: true } } } } },
    },
  },
});

console.log(`\n=== ${season?.year} standings (champion: ${season?.champion?.name}) ===`);
for (const t of season?.teams ?? []) {
  const manager = t.memberships[0]?.user.name ?? "?";
  console.log(
    `${String(t.regularSeasonRank).padStart(2)}. ${t.name.padEnd(28)} ${manager.padEnd(20)} ` +
      `${t.wins}-${t.losses}  PF ${Number(t.pointsFor).toFixed(1).padStart(7)}  ` +
      `PA ${Number(t.pointsAgainst).toFixed(1).padStart(7)}  final ${t.finalRank ?? "-"}`,
  );
}

const top = await db.matchup.findMany({
  where: { isComplete: true },
  orderBy: [{ homeScore: "desc" }],
  take: 3,
  include: {
    homeTeam: { select: { name: true } },
    awayTeam: { select: { name: true } },
    season: { select: { year: true } },
  },
});
console.log("\n=== highest home scores all-time ===");
for (const m of top) {
  console.log(
    `${m.season.year} wk${m.week}  ${m.homeTeam.name} ${Number(m.homeScore).toFixed(2)} ` +
      `vs ${m.awayTeam.name} ${Number(m.awayScore).toFixed(2)}`,
  );
}

const bestPerf = await db.matchupPlayer.findMany({
  orderBy: { points: "desc" },
  take: 5,
  include: { player: { select: { fullName: true, position: true } } },
});
console.log("\n=== best single-game player performances ===");
for (const p of bestPerf) {
  console.log(
    `${p.player.fullName.padEnd(24)} ${p.player.position.padEnd(4)} ${Number(p.points).toFixed(2)}  starter=${p.isStarter}`,
  );
}

const agg = await db.matchup.aggregate({
  where: { isComplete: true },
  _avg: { homeScore: true },
  _min: { homeScore: true },
  _max: { homeScore: true },
});
console.log("\n=== score distribution ===");
console.log(
  `avg ${Number(agg._avg.homeScore).toFixed(1)}  min ${Number(agg._min.homeScore).toFixed(1)}  max ${Number(agg._max.homeScore).toFixed(1)}`,
);

const champs = await db.season.findMany({
  where: { championTeamId: { not: null } },
  orderBy: [{ leagueId: "asc" }, { year: "asc" }],
  include: {
    league: { select: { name: true } },
    champion: {
      select: { name: true, memberships: { include: { user: { select: { name: true } } } } },
    },
  },
});
console.log("\n=== champions ===");
for (const s of champs) {
  console.log(
    `${s.league.name.padEnd(22)} ${s.year}  ${s.champion?.name.padEnd(28)} ${s.champion?.memberships[0]?.user.name}`,
  );
}

await db.$disconnect();
