import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, PlugZap } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Data Sync" };

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminSyncPage() {
  await requireRole("ADMIN");

  const [syncs, leagues] = await Promise.all([
    db.dataSync.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        league: { select: { name: true } },
        triggeredBy: { select: { name: true } },
        _count: { select: { errors: true } },
      },
    }),
    db.league.findMany({
      select: {
        id: true,
        name: true,
        provider: true,
        providerCredential: { select: { provider: true, lastCheckedAt: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const latest = syncs[0];

  return (
    <AdminShell
      title="Data Sync"
      description="Pulls league data from the platform it actually lives on, normalizes it, and re-runs the event engine."
      wide
    >
      <SectionHeader label="Status" title="Last sync" />
      <StatGrid columns={4} className="mb-10">
        <Stat
          label="Status"
          value={latest?.status ?? "Never run"}
          size="sm"
          tone={
            latest?.status === "SUCCESS"
              ? "win"
              : latest?.status === "FAILED"
                ? "loss"
                : "muted"
          }
          sub={latest ? dateTimeFormat.format(latest.startedAt) : undefined}
        />
        <Stat label="Records updated" value={latest?.recordsUpdated ?? 0} size="sm" />
        <Stat label="New memories" value={latest?.memoriesCreated ?? 0} size="sm" />
        <Stat
          label="Errors"
          value={latest?._count.errors ?? 0}
          size="sm"
          tone={(latest?._count.errors ?? 0) > 0 ? "loss" : "muted"}
        />
      </StatGrid>

      <SectionHeader label="Connections" title="Providers" />
      <div className="mb-10 space-y-3">
        {leagues.map((league) => (
          <Card key={league.id} variant="bordered" className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-surface-2 grid size-10 shrink-0 place-items-center rounded-xl">
                {league.providerCredential ? (
                  <CheckCircle2 className="text-win size-5" />
                ) : (
                  <PlugZap className="text-faint size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{league.name}</p>
                <p className="text-faint text-xs">
                  {league.providerCredential
                    ? `${league.providerCredential.provider} connected`
                    : "No provider connected — data is local only"}
                </p>
              </div>
              <Badge size="xs" tone={league.providerCredential ? "win" : "neutral"}>
                {league.provider}
              </Badge>
            </div>
          </Card>
        ))}
      </div>

      <SectionHeader label="Setup" title="What each provider needs" />
      <div className="mb-10 grid gap-3 sm:grid-cols-2">
        <Card variant="bordered" className="p-5">
          <p className="text-sm font-semibold">ESPN Fantasy</p>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Public leagues need only the league ID. Private leagues and prior
            seasons additionally require the <code>SWID</code> and{" "}
            <code>espn_s2</code> cookies from a signed-in browser session.
          </p>
          <p className="text-faint mt-3 text-xs">
            Cookies must be supplied by the league owner. They are stored
            encrypted and never sent to the browser.
          </p>
        </Card>
        <Card variant="bordered" className="p-5">
          <p className="text-sm font-semibold">Yahoo Fantasy</p>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            Requires an app registered at developer.yahoo.com, then a one-time
            OAuth2 authorization. League keys take the form{" "}
            <code>{"{game_id}.l.{league_id}"}</code>, so the NFL game id has to
            be resolved per season.
          </p>
          <p className="text-faint mt-3 text-xs">
            OAuth applies to every read, including public leagues.
          </p>
        </Card>
      </div>

      <SectionHeader label="History" title="Sync log" />
      {syncs.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No syncs yet"
          description="Connect a provider to a league, then run a sync to import real history."
        />
      ) : (
        <div className="space-y-2">
          {syncs.map((sync) => (
            <Card key={sync.id} variant="bordered" className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  size="xs"
                  tone={
                    sync.status === "SUCCESS"
                      ? "win"
                      : sync.status === "FAILED"
                        ? "loss"
                        : "neutral"
                  }
                >
                  {sync.status}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {sync.league.name} · {sync.provider} · {sync.mode}
                  </p>
                  <p className="text-faint text-xs">
                    {dateTimeFormat.format(sync.startedAt)}
                    {sync.triggeredBy ? ` · by ${sync.triggeredBy.name}` : ""}
                  </p>
                </div>
                <p className="text-faint shrink-0 text-xs">
                  +{sync.recordsCreated} / ~{sync.recordsUpdated}
                  {sync._count.errors > 0 ? ` · ${sync._count.errors} errors` : ""}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
