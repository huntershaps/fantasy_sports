import type { Metadata } from "next";
import Link from "next/link";
import {
  Database,
  ImageIcon,
  Medal,
  RefreshCw,
  Shield,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/layout";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Admin" };

const TOOLS = [
  { href: "/admin/leagues", label: "Leagues", icon: Shield, blurb: "Create, edit, and archive leagues and seasons." },
  { href: "/admin/users", label: "Users", icon: Users, blurb: "Accounts, roles, memberships, and team links." },
  { href: "/admin/awards", label: "Awards", icon: Trophy, blurb: "Award catalog and manual assignments." },
  { href: "/admin/memories", label: "Memories", icon: Sparkles, blurb: "Feature, hide, edit, or write memories." },
  { href: "/admin/records", label: "Records", icon: Medal, blurb: "Verify, correct, or override records." },
  { href: "/admin/logos", label: "Logos", icon: ImageIcon, blurb: "Upload or replace crests ESPN cannot serve." },
  { href: "/admin/sync", label: "Data Sync", icon: RefreshCw, blurb: "Pull from ESPN and Yahoo, review errors." },
  { href: "/admin/data", label: "Data", icon: Database, blurb: "Rebuild derived data, import, and export." },
];

export default async function AdminPage() {
  const actor = await requireRole("ADMIN");

  const [users, leagues, seasons, matchups, memories, awards, records, lastSync] =
    await Promise.all([
      db.user.count(),
      db.league.count(),
      db.season.count(),
      db.matchup.count(),
      db.memory.count(),
      db.award.count(),
      db.leagueRecord.count({ where: { isCurrent: true } }),
      db.dataSync.findFirst({ orderBy: { startedAt: "desc" } }),
    ]);

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <p className="label">Control room</p>
          <Badge tone="neutral" size="xs">
            {actor.role === "SUPER_ADMIN" ? "Super Admin" : "Admin"}
          </Badge>
        </div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Everything in the archive, editable. Derived data can always be rebuilt
          from raw games without losing manual corrections.
        </p>
      </header>

      <SectionHeader label="At a glance" title="The archive" />
      <StatGrid columns={4} className="mb-4">
        <Stat label="Users" value={users} size="sm" />
        <Stat label="Leagues" value={leagues} size="sm" />
        <Stat label="Seasons" value={seasons} size="sm" />
        <Stat label="Matchups" value={matchups.toLocaleString()} size="sm" />
      </StatGrid>
      <StatGrid columns={4} className="mb-10">
        <Stat label="Memories" value={memories.toLocaleString()} size="sm" tone="brand" />
        <Stat label="Awards" value={awards.toLocaleString()} size="sm" tone="brand" />
        <Stat label="Current records" value={records} size="sm" tone="brand" />
        <Stat
          label="Last sync"
          value={lastSync ? lastSync.status : "Never"}
          size="sm"
          tone={lastSync?.status === "SUCCESS" ? "win" : "muted"}
          sub={lastSync ? lastSync.startedAt.toLocaleDateString() : "No provider connected"}
        />
      </StatGrid>

      <SectionHeader label="Tools" title="Manage" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card
              variant="bordered"
              className="h-full p-5 transition-colors hover:border-line-strong"
            >
              <span className="bg-surface-2 mb-4 grid size-10 place-items-center rounded-xl">
                <tool.icon className="text-brand size-5" />
              </span>
              <p className="text-sm font-semibold">{tool.label}</p>
              <p className="text-muted mt-1.5 text-sm leading-relaxed">{tool.blurb}</p>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
