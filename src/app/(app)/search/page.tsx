import type { Metadata } from "next";
import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Stat, StatGrid } from "@/components/ui/stat";
import { requireViewContext } from "@/lib/session";
import { getPlayerDossier, search } from "@/lib/queries/search";

export const metadata: Metadata = { title: "Search" };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const results = q ? await search(actor, viewer.id, q) : null;

  // An exact player-name match promotes the full dossier above the hit list.
  const exactPlayer = results?.groups
    .find((g) => g.label === "Players")
    ?.hits.find((h) => h.title.toLowerCase() === q.trim().toLowerCase());
  const dossier = exactPlayer ? await getPlayerDossier(actor, exactPlayer.title) : null;

  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow mb-2">Everything, everywhere</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Search</h1>
      </header>

      <form action="/search" className="mb-8 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Try a player, manager, team, or trade…"
          aria-label="Search"
          className="h-12 text-base"
        />
        <Button type="submit" variant="primary" size="lg">
          Search
        </Button>
      </form>

      {!q ? (
        <EmptyState
          icon={SearchIcon}
          title="Search the whole archive"
          description="Managers, teams, players, matchups, awards, memories, trades, and waiver moves."
        />
      ) : results && results.total === 0 ? (
        <EmptyState
          icon={SearchIcon}
          title={`Nothing for “${q}”`}
          description="Try a shorter phrase, or a player's last name."
        />
      ) : (
        <div className="space-y-10">
          {dossier ? (
            <section>
              <SectionHeader
                eyebrow="Player dossier"
                title={dossier.player.fullName}
              />
              <StatGrid columns={3} className="mb-5">
                <Stat
                  label="Position"
                  value={dossier.player.position}
                  size="sm"
                  sub={dossier.player.nflTeam ?? undefined}
                />
                <Stat
                  label="Best game"
                  value={dossier.bestGames[0]?.points ?? "—"}
                  size="sm"
                  tone="field"
                  sub={
                    dossier.bestGames[0]
                      ? `${dossier.bestGames[0].year} wk ${dossier.bestGames[0].week}`
                      : undefined
                  }
                />
                <Stat
                  label="Times drafted"
                  value={dossier.drafts.length}
                  size="sm"
                />
              </StatGrid>

              {dossier.bestGames.length > 0 ? (
                <Card variant="flat" className="divide-line mb-5 divide-y">
                  <p className="eyebrow px-4 pt-4 pb-2">Best performances</p>
                  {dossier.bestGames.map((game) => (
                    <Link
                      key={game.id}
                      href={`/matchup/${game.matchupId}`}
                      className="hover:bg-surface-2 flex items-center gap-3 px-4 py-3 transition-colors"
                    >
                      <span className="stat-figure text-gold w-16 shrink-0 text-lg">
                        {game.points}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {game.teamName}
                        </span>
                        <span className="text-subtle block truncate text-xs">
                          {game.year} · Week {game.week} · {game.leagueName}
                        </span>
                      </span>
                    </Link>
                  ))}
                </Card>
              ) : null}

              {dossier.transactions.length > 0 ? (
                <Card variant="flat" className="divide-line divide-y">
                  <p className="eyebrow px-4 pt-4 pb-2">Transaction history</p>
                  {dossier.transactions.map((txn) => (
                    <div key={txn.id} className="flex items-center gap-3 px-4 py-3">
                      <span className="text-subtle w-24 shrink-0 text-[11px] font-bold tracking-wide uppercase">
                        {txn.type.replace(/_/g, " ")}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {txn.team.name}
                        {txn.faabSpent ? ` · $${txn.faabSpent}` : ""}
                      </span>
                      <span className="text-subtle shrink-0 text-xs">
                        {dateFormat.format(txn.occurredOn)}
                      </span>
                    </div>
                  ))}
                </Card>
              ) : null}
            </section>
          ) : null}

          {results?.groups.map((group) => (
            <section key={group.label}>
              <SectionHeader eyebrow={`${group.hits.length} found`} title={group.label} />
              <Card variant="flat" className="divide-line divide-y">
                {group.hits.map((hit) => (
                  <Link
                    key={hit.id}
                    href={hit.href}
                    className="hover:bg-surface-2 block px-4 py-3 transition-colors"
                  >
                    <p className="truncate font-medium">{hit.title}</p>
                    <p className="text-subtle truncate text-xs">{hit.subtitle}</p>
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
