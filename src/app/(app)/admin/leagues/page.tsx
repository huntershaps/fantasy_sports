import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setLeaguePublic } from "@/app/actions/admin";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Manage Leagues" };

export default async function AdminLeaguesPage() {
  await requireRole("ADMIN");

  const leagues = await db.league.findMany({
    orderBy: { foundedYear: "asc" },
    include: {
      settings: true,
      seasons: { orderBy: { year: "desc" }, select: { id: true, year: true, status: true } },
      _count: { select: { memberships: true, franchises: true } },
      providerCredential: { select: { provider: true, lastCheckedAt: true } },
    },
  });

  return (
    <AdminShell
      title="Leagues"
      description="Each league is an independent history. Provider credentials are stored encrypted and never leave the server."
      wide
    >
      <div className="space-y-4">
        {leagues.map((league) => (
          <Card key={league.id} variant="bordered" className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/league/${league.slug}`}
                    className="text-base font-semibold hover:underline"
                  >
                    {league.name}
                  </Link>
                  <Badge size="xs">{league.provider}</Badge>
                  {league.isArchived ? (
                    <Badge tone="loss" size="xs">
                      Archived
                    </Badge>
                  ) : null}
                  {league.isPublic ? (
                    <Badge tone="win" size="xs">
                      Public
                    </Badge>
                  ) : null}
                </div>
                <p className="text-faint text-xs">
                  /{league.slug} · est. {league.foundedYear} ·{" "}
                  {league._count.memberships} managers · {league._count.franchises}{" "}
                  franchises
                </p>
              </div>

              <div className="text-right">
                <p className="label mb-1">Provider</p>
                <p className="text-sm font-semibold">
                  {league.providerCredential ? "Connected" : "Not connected"}
                </p>
              </div>
            </div>

            <div className="border-line mt-4 flex flex-wrap gap-2 border-t pt-4">
              {league.seasons.map((season) => (
                <Link
                  key={season.id}
                  href={`/league/${league.slug}?season=${season.year}`}
                  className="border-line bg-surface-2 hover:border-line-strong inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors"
                >
                  {season.year}
                  {season.status === "IN_PROGRESS" ? (
                    <span className="bg-info size-1.5 rounded-full" />
                  ) : null}
                </Link>
              ))}
            </div>

            <div className="border-line mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <div className="min-w-0">
                <p className="label mb-1">Public archive</p>
                <p className="text-faint text-xs">
                  {league.isPublic ? (
                    <>
                      Anyone with the link can read this league&rsquo;s honour roll and
                      standings, including manager names, at{" "}
                      <Link href={`/l/${league.slug}`} className="hover:underline">
                        /l/{league.slug}
                      </Link>
                      .
                    </>
                  ) : (
                    "Private. Only members and admins can see this league."
                  )}
                </p>
              </div>

              <form action={setLeaguePublic}>
                <input type="hidden" name="leagueId" value={league.id} />
                <input type="hidden" name="isPublic" value={league.isPublic ? "false" : "true"} />
                <Button type="submit" variant={league.isPublic ? "outline" : "primary"} size="sm">
                  {league.isPublic ? "Make private" : "Publish publicly"}
                </Button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
