import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { MemoryCard } from "@/components/cards/memory-card";
import { requireViewContext } from "@/lib/session";
import {
  MEMORY_FILTERS,
  countMemories,
  listMemories,
  type MemoryFilter,
} from "@/lib/queries/memories";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Memories" };

const PAGE_SIZE = 40;

export default async function MemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const { filter: rawFilter, page: rawPage } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const filter = (MEMORY_FILTERS.find((f) => f.value === rawFilter)?.value ??
    "all") as MemoryFilter;
  const page = Math.max(1, Number(rawPage) || 1);

  const [memories, total] = await Promise.all([
    listMemories(actor, viewer.id, {
      filter,
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    countMemories(actor),
  ]);

  const hasMore = memories.length === PAGE_SIZE;

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow mb-2">The archive</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Memories</h1>
        <p className="text-muted mt-3 max-w-2xl">
          {total.toLocaleString()} moments from your leagues, told from your side
          of them.
        </p>
      </header>

      {/* Filters are links so the feed stays server-rendered and shareable. */}
      <nav
        aria-label="Filter memories"
        className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {MEMORY_FILTERS.map((option) => {
          const isActive = option.value === filter;
          return (
            <Link
              key={option.value}
              href={option.value === "all" ? "/memories" : `/memories?filter=${option.value}`}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-flex h-9 shrink-0 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                isActive
                  ? "border-gold bg-gold text-inverse"
                  : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          );
        })}
      </nav>

      {memories.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nothing here yet"
          description={
            filter === "mine"
              ? "None of these memories involve you — try another filter."
              : "Once your leagues have history, this feed fills up fast."
          }
        />
      ) : (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            {memories.map((memory) => (
              <MemoryCard key={memory.id} memory={memory} showLeague />
            ))}
          </div>

          {(page > 1 || hasMore) && (
            <nav
              aria-label="Pagination"
              className="mt-8 flex items-center justify-between gap-3"
            >
              {page > 1 ? (
                <Link
                  href={`/memories?filter=${filter}&page=${page - 1}`}
                  className="border-line hover:bg-surface-2 rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span className="text-subtle text-sm">Page {page}</span>
              {hasMore ? (
                <Link
                  href={`/memories?filter=${filter}&page=${page + 1}`}
                  className="border-line hover:bg-surface-2 rounded-xl border px-4 py-2 text-sm font-medium"
                >
                  Next
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
