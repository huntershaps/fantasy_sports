import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryEntry, FeaturedMemory } from "@/components/cards/memory-card";
import { requireViewContext } from "@/lib/session";
import {
  MEMORY_FILTERS,
  countMemories,
  listMemories,
  type MemoryCardData,
  type MemoryFilter,
} from "@/lib/queries/memories";
import { listLeagues } from "@/lib/queries/leagues";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Memories" };

const PAGE_SIZE = 60;

const yearFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: "UTC",
});

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string; league?: string }>;
}) {
  const { filter: rawFilter, page: rawPage, league: leagueSlug } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const filter = (MEMORY_FILTERS.find((f) => f.value === rawFilter)?.value ??
    "all") as MemoryFilter;
  const page = Math.max(1, Number(rawPage) || 1);

  const leagues = await listLeagues(actor);
  const league = leagues.find((l) => l.slug === leagueSlug);

  const [memories, total] = await Promise.all([
    listMemories(actor, viewer.id, {
      filter,
      leagueId: league?.id,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
      order: "chronological",
    }),
    countMemories(actor, league?.id),
  ]);

  const hasMore = memories.length === PAGE_SIZE;
  // Feature the most notable item on the page, not simply the newest one.
  const showFeature = page === 1 && memories.length > 0;
  const feature = showFeature
    ? [...memories].sort((a, b) => b.importance - a.importance)[0]
    : null;
  const body = feature ? memories.filter((m) => m.id !== feature.id) : memories;

  // Group the feed by year so a decade of history reads as a chronicle.
  const byYear = new Map<string, MemoryCardData[]>();
  for (const memory of body) {
    const year = yearFormat.format(memory.occurredOn);
    const list = byYear.get(year) ?? [];
    list.push(memory);
    byYear.set(year, list);
  }

  const query = (next: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("filter", filter);
    if (league) params.set("league", league.slug);
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined) params.delete(key);
      else params.set(key, String(value));
    }
    const qs = params.toString();
    return qs ? `/memories?${qs}` : "/memories";
  };

  return (
    <PageContainer className="py-6">
      <PageHeader
        label="The archive"
        title={league ? `${league.name} memories` : "Memories"}
        description={`${total.toLocaleString()} moments, told from your side of them.`}
      />

      <nav
        aria-label="Filter memories"
        className="no-scrollbar border-line mb-6 flex gap-1 overflow-x-auto border-b pb-3"
      >
        {MEMORY_FILTERS.map((option) => {
          const isActive = option.value === filter;
          const href =
            option.value === "all"
              ? league
                ? `/memories?league=${league.slug}`
                : "/memories"
              : query({ filter: option.value, page: undefined });
          return (
            <Link
              key={option.value}
              href={href}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-surface-3 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      {memories.length === 0 ? (
        <EmptyState
          title="Nothing here yet"
          description={
            filter === "mine"
              ? "None of these memories involve you — try another filter."
              : "Once your leagues have history, this archive fills up fast."
          }
        />
      ) : (
        <>
          {feature ? (
            <div className="border-line mb-8 border-b pb-8">
              <FeaturedMemory memory={feature} label="Featured" />
            </div>
          ) : null}

          <div className="space-y-8">
            {[...byYear.entries()].map(([year, entries]) => (
              <Section key={year}>
                {/* Year as a running head, sticky so the reader keeps their place. */}
                <div className="border-line bg-base sticky top-12 z-10 mb-1 border-t py-2">
                  <h2 className="figure-num text-muted text-sm">{year}</h2>
                </div>
                <div>
                  {entries.map((memory) => (
                    <MemoryEntry key={memory.id} memory={memory} showLeague={!league} />
                  ))}
                </div>
              </Section>
            ))}
          </div>

          {(page > 1 || hasMore) && (
            <nav
              aria-label="Pagination"
              className="border-line mt-8 flex items-center justify-between gap-3 border-t pt-4"
            >
              {page > 1 ? (
                <Link
                  href={query({ page: page - 1 })}
                  className="text-muted hover:text-ink text-sm"
                >
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-faint text-xs">Page {page}</span>
              {hasMore ? (
                <Link
                  href={query({ page: page + 1 })}
                  className="text-muted hover:text-ink text-sm"
                >
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
      <SectionHeader className="sr-only" label="End of feed" />
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
