import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Manage Seasons" };

export default async function AdminSeasonsPage() {
  await requireRole("ADMIN");

  const seasons = await db.season.findMany({
    orderBy: [{ year: "desc" }, { leagueId: "asc" }],
    include: {
      league: { select: { name: true, slug: true } },
      champion: { select: { name: true } },
      _count: { select: { teams: true, matchups: true, trades: true, draftPicks: true } },
    },
  });

  return (
    <AdminShell
      title="Seasons"
      description="Every season across every league. Re-importing a season updates rows in place rather than replacing history."
      wide
    >
      <div className="space-y-2">
        {seasons.map((season) => (
          <Card key={season.id} variant="bordered" className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="figure-num w-16 shrink-0 text-2xl">{season.year}</span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  <Link
                    href={`/league/${season.league.slug}?season=${season.year}`}
                    className="hover:underline"
                  >
                    {season.league.name}
                  </Link>
                  <Badge
                    size="xs"
                    tone={season.status === "IN_PROGRESS" ? "info" : "neutral"}
                  >
                    {season.status.replace(/_/g, " ")}
                  </Badge>
                </p>
                <p className="text-faint text-xs">
                  {season._count.teams} teams · {season._count.matchups} matchups ·{" "}
                  {season._count.trades} trades · {season._count.draftPicks} picks
                  {season.champion ? ` · champion: ${season.champion.name}` : ""}
                </p>
              </div>
              <span className="text-faint shrink-0 text-xs">
                Week {season.currentWeek}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
