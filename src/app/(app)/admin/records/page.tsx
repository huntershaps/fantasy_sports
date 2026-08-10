import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { verifyRecord } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Manage Records" };

export default async function AdminRecordsPage() {
  await requireRole("ADMIN");

  const records = await db.leagueRecord.findMany({
    where: { isCurrent: true },
    orderBy: [{ leagueId: "asc" }, { category: "asc" }, { key: "asc" }],
    include: {
      league: { select: { name: true } },
      verifiedBy: { select: { name: true } },
      previous: { select: { displayValue: true } },
    },
  });

  return (
    <AdminShell
      title="Records"
      description="Current record holders. Verifying marks a record as human-checked; rebuilds preserve the flag."
      wide
    >
      <div className="space-y-2">
        {records.map((record) => (
          <Card key={record.id} variant="flat" className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <span className="stat-figure text-gold w-28 shrink-0 text-xl">
                {record.displayValue}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  {record.label}
                  <Badge size="xs">{record.category}</Badge>
                  <Badge size="xs">{record.league.name}</Badge>
                  {record.verifiedAt ? (
                    <Badge tone="field" size="xs">
                      Verified
                    </Badge>
                  ) : null}
                </p>
                <p className="text-subtle truncate text-xs">{record.description}</p>
                {record.previous ? (
                  <p className="text-subtle text-xs">
                    Previous: {record.previous.displayValue}
                  </p>
                ) : null}
              </div>
              {!record.verifiedAt ? (
                <form action={verifyRecord}>
                  <input type="hidden" name="recordId" value={record.id} />
                  <Button type="submit" variant="subtle" size="sm">
                    Verify
                  </Button>
                </form>
              ) : (
                <span className="text-subtle text-xs">
                  by {record.verifiedBy?.name}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
