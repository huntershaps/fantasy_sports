import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Manage Awards" };

export default async function AdminAwardsPage() {
  await requireRole("ADMIN");

  const definitions = await db.awardDefinition.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      league: { select: { name: true } },
      _count: { select: { awards: true } },
    },
  });

  return (
    <AdminShell
      title="Awards"
      description="The award catalog. Built-ins are granted by the event engine; league-scoped definitions override a built-in with the same key."
      wide
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {definitions.map((definition) => (
          <Card key={definition.id} variant="bordered" className="p-4">
            <div className="flex items-start gap-3">
              <span
                className="grid size-11 shrink-0 place-items-center rounded-xl text-2xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${definition.accentColor} 14%, transparent)`,
                }}
              >
                {definition.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-semibold">
                  {definition.name}
                  <Badge size="xs" tone={definition.tier === "SHAME" ? "loss" : "neutral"}>
                    {definition.tier}
                  </Badge>
                  {definition.grantsCertificate ? (
                    <Badge size="xs" tone="brand">
                      Certificate
                    </Badge>
                  ) : null}
                </p>
                <p className="text-muted mt-1 text-xs leading-relaxed">
                  {definition.description}
                </p>
                <p className="text-faint mt-2 text-xs">
                  <code>{definition.key}</code> · {definition.scope} ·{" "}
                  {definition._count.awards} granted ·{" "}
                  {definition.league?.name ?? "all leagues"}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
