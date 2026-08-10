import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionHeader } from "@/components/ui/card";
import { AwardCard } from "@/components/cards/award-card";
import { requireViewContext } from "@/lib/session";
import { listAwards } from "@/lib/queries/awards";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Awards" };

const SCOPES = [
  { value: "all", label: "Every award" },
  { value: "mine", label: "My trophy cabinet" },
] as const;

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope: rawScope } = await searchParams;
  const { actor, viewer } = await requireViewContext();
  const scope = rawScope === "mine" ? "mine" : "all";

  const awards = await listAwards(actor, {
    userId: scope === "mine" ? viewer.id : undefined,
    take: 120,
  });

  const featured = awards.filter((a) => a.tier === "LEGENDARY").slice(0, 3);
  const rest = awards.filter((a) => !featured.some((f) => f.id === a.id));

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow mb-2">Hall of fame</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Awards</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Championships, blowouts, catastrophes, and the trades nobody has
          forgiven.
        </p>
      </header>

      <nav aria-label="Award scope" className="mb-8 flex flex-wrap gap-2">
        {SCOPES.map((option) => {
          const isActive = option.value === scope;
          return (
            <Link
              key={option.value}
              href={option.value === "all" ? "/awards" : "/awards?scope=mine"}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors",
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

      {awards.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={scope === "mine" ? "No awards yet" : "No awards recorded"}
          description={
            scope === "mine"
              ? "Win something. Or lose spectacularly — several of these are for that."
              : "Awards are generated from league history once seasons are imported."
          }
        />
      ) : (
        <div className="space-y-10">
          {featured.length > 0 ? (
            <section>
              <SectionHeader eyebrow="Legendary" title="The big ones" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((award) => (
                  <AwardCard key={award.id} award={award} />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {featured.length > 0 ? (
              <SectionHeader eyebrow="Everything else" title="The full cabinet" />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {rest.map((award) => (
                <AwardCard key={award.id} award={award} />
              ))}
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
