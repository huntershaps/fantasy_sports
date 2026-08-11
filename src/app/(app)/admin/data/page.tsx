import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/layout";
import { Stat, StatGrid } from "@/components/ui/stat";
import { RebuildPanel } from "@/components/admin/rebuild-panel";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Manage Data" };

export default async function AdminDataPage() {
  await requireRole("ADMIN");

  const [leagues, counts] = await Promise.all([
    db.league.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    Promise.all([
      db.matchup.count(),
      db.matchupPlayer.count(),
      db.rosterTransaction.count(),
      db.draftPick.count(),
      db.memory.count({ where: { source: "AUTO" } }),
      db.memory.count({ where: { source: "MANUAL" } }),
      db.award.count({ where: { source: "AUTO" } }),
      db.award.count({ where: { source: "MANUAL" } }),
    ]),
  ]);

  const [
    matchups,
    lineupSlots,
    transactions,
    draftPicks,
    autoMemories,
    manualMemories,
    autoAwards,
    manualAwards,
  ] = counts;

  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <header className="mb-8">
        <Link href="/admin" className="text-muted hover:text-ink text-sm">
          ← Admin
        </Link>
        <h1 className="mt-3 text-2xl font-semibold">Data</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Raw game data is the source of truth. Everything else is derived from
          it and can be regenerated.
        </p>
      </header>

      <SectionHeader label="Raw data" title="What the engine reads" />
      <StatGrid columns={4} className="mb-10">
        <Stat label="Matchups" value={matchups.toLocaleString()} size="sm" />
        <Stat label="Lineup slots" value={lineupSlots.toLocaleString()} size="sm" />
        <Stat label="Transactions" value={transactions.toLocaleString()} size="sm" />
        <Stat label="Draft picks" value={draftPicks.toLocaleString()} size="sm" />
      </StatGrid>

      <SectionHeader label="Derived data" title="What the engine writes" />
      <StatGrid columns={4} className="mb-4">
        <Stat label="Auto memories" value={autoMemories.toLocaleString()} size="sm" />
        <Stat
          label="Manual memories"
          value={manualMemories.toLocaleString()}
          size="sm"
          tone="brand"
          sub="Preserved on rebuild"
        />
        <Stat label="Auto awards" value={autoAwards.toLocaleString()} size="sm" />
        <Stat
          label="Manual awards"
          value={manualAwards.toLocaleString()}
          size="sm"
          tone="brand"
          sub="Preserved on rebuild"
        />
      </StatGrid>

      <div className="mt-8">
        <RebuildPanel leagues={leagues} />
      </div>

      <Card variant="bordered" className="mt-6 p-5">
        <h2 className="text-sm font-semibold">Import and export</h2>
        <p className="text-muted mt-1.5 text-sm leading-relaxed">
          Provider imports run from{" "}
          <Link href="/admin/sync" className="text-brand hover:underline">
            Data Sync
          </Link>
          . No provider is connected yet.
        </p>
      </Card>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
