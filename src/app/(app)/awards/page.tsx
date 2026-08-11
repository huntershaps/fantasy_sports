import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { TrophyCase } from "@/components/cards/award-card";
import { requireViewContext } from "@/lib/session";
import { listAwards } from "@/lib/queries/awards";
import { listLeagues } from "@/lib/queries/leagues";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Awards" };

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; league?: string }>;
}) {
  const { scope: rawScope, league: leagueSlug } = await searchParams;
  const { actor, viewer } = await requireViewContext();
  const scope = rawScope === "mine" ? "mine" : "all";

  const leagues = await listLeagues(actor);
  const league = leagues.find((l) => l.slug === leagueSlug);

  const awards = await listAwards(actor, {
    userId: scope === "mine" ? viewer.id : undefined,
    leagueId: league?.id,
    take: 200,
  });

  // Group by season so the case reads chronologically, newest shelf first.
  const bySeason = new Map<string, typeof awards>();
  for (const award of awards) {
    const list = bySeason.get(award.seasonLabel) ?? [];
    list.push(award);
    bySeason.set(award.seasonLabel, list);
  }
  const groups = [...bySeason.entries()]
    .map(([label, list]) => ({ label, awards: list }))
    .sort((a, b) => (a.label === "All Time" ? -1 : b.label.localeCompare(a.label)));

  const filters = [
    { label: "Every award", href: "/awards", active: scope === "all" && !league },
    { label: "My cabinet", href: "/awards?scope=mine", active: scope === "mine" },
    ...leagues.map((l) => ({
      label: l.name,
      href: `/awards?league=${l.slug}`,
      active: league?.id === l.id,
    })),
  ];

  return (
    <PageContainer width="wide" className="py-6">
      <PageHeader
        label="Hall of fame"
        title={scope === "mine" ? "Your trophy cabinet" : "Awards"}
        description={
          scope === "mine"
            ? "Everything you have won, and a few things you would rather not have."
            : "Championships, blowouts, catastrophes, and the trades nobody has forgiven."
        }
      />

      <nav aria-label="Filter awards" className="no-scrollbar mb-6 flex gap-1 overflow-x-auto">
        {filters.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            aria-current={filter.active ? "true" : undefined}
            className={cn(
              "inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
              filter.active
                ? "bg-surface-3 text-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {awards.length === 0 ? (
        <EmptyState
          title={scope === "mine" ? "Nothing in the cabinet yet" : "No awards recorded"}
          description={
            scope === "mine"
              ? "Win a week, break a record, or make a catastrophic trade. All of them count."
              : "Awards are generated from league history once seasons are imported."
          }
        />
      ) : (
        <TrophyCase groups={groups} />
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
