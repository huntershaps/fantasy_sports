import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Crest } from "@/components/ui/crest";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { requireViewContext } from "@/lib/session";
import { getPlayerDossier, search } from "@/lib/queries/search";
import { withBase } from "@/lib/paths";

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

  const exactPlayer = results?.groups
    .find((g) => g.label === "Players")
    ?.hits.find((h) => h.title.toLowerCase() === q.trim().toLowerCase());
  const dossier = exactPlayer ? await getPlayerDossier(actor, exactPlayer.title) : null;

  return (
    <PageContainer className="py-6">
      <PageHeader label="Everything, everywhere" title="Search" />

      {/* A raw form action is a plain URL — Next prefixes next/link and
          redirect(), but not this — so it needs the base path explicitly.
          Without it the form submits to /search and 404s. */}
      <form action={withBase("/search")} className="mb-8 flex gap-2">
        <Input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="A player, manager, team, or trade…"
          aria-label="Search"
          className="h-9"
        />
        <Button type="submit" variant="primary" size="md">
          Search
        </Button>
      </form>

      {!q ? (
        <EmptyState
          title="Search the whole archive"
          description="Managers, teams, players, matchups, awards, memories, trades, and waiver moves."
        />
      ) : results && results.total === 0 ? (
        <EmptyState
          title={`Nothing for “${q}”`}
          description="Try a shorter phrase, or a player's last name."
        />
      ) : (
        <div className="space-y-8">
          {dossier ? (
            <Section>
              <SectionHeader label="Player" title={dossier.player.fullName} rule={false} />
              <dl className="border-line mb-5 flex flex-wrap gap-x-8 gap-y-3 border-y py-3">
                <Figure label="Position" value={dossier.player.position} />
                <Figure label="NFL team" value={dossier.player.nflTeam ?? "—"} />
                <Figure
                  label="Best game"
                  value={dossier.bestGames[0]?.points ?? "—"}
                  sub={
                    dossier.bestGames[0]
                      ? `${dossier.bestGames[0].year} wk ${dossier.bestGames[0].week}`
                      : undefined
                  }
                />
                <Figure label="Times drafted" value={String(dossier.drafts.length)} />
              </dl>

              {dossier.bestGames.length > 0 ? (
                <div className="mb-6">
                  <p className="label mb-2">Best performances</p>
                  <ul className="border-line divide-line divide-y border-t">
                    {dossier.bestGames.map((game) => (
                      <li key={game.id}>
                        <Link
                          href={`/matchup/${game.matchupId}`}
                          className="hover:bg-surface -mx-3 flex items-baseline gap-4 px-3 py-2 transition-colors"
                        >
                          <span className="figure-num tnum text-brand w-14 shrink-0 text-base">
                            {game.points}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {game.teamName}
                          </span>
                          <span className="text-faint tnum shrink-0 text-xs">
                            {game.year} · wk {game.week}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {dossier.transactions.length > 0 ? (
                <div>
                  <p className="label mb-2">Transaction history</p>
                  <ul className="border-line divide-line divide-y border-t">
                    {dossier.transactions.map((txn) => (
                      <li key={txn.id} className="flex items-baseline gap-4 py-2">
                        <span className="label w-24 shrink-0">
                          {txn.type.replace(/_/g, " ")}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {txn.team.name}
                          {txn.faabSpent ? ` · $${txn.faabSpent}` : ""}
                        </span>
                        <span className="text-faint tnum shrink-0 text-xs">
                          {dateFormat.format(txn.occurredOn)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>
          ) : null}

          {results?.groups.map((group) => (
            <Section key={group.label}>
              <SectionHeader
                label={group.label}
                action={<span className="text-faint text-xs">{group.hits.length}</span>}
              />
              <ul className="border-line divide-line divide-y border-t">
                {group.hits.map((hit) => (
                  <li key={hit.id}>
                    <Link
                      href={hit.href}
                      className="hover:bg-surface -mx-3 flex items-center gap-2.5 px-3 py-2.5 transition-colors"
                    >
                      {hit.crest !== undefined ? (
                        <Crest
                          name={hit.title}
                          src={hit.crest}
                          size="md"
                          shape="round"
                        />
                      ) : null}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{hit.title}</span>
                        <span className="text-faint block truncate text-xs">{hit.subtitle}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className="figure-num tnum text-base">{value}</dd>
      {sub ? <p className="text-faint text-xs">{sub}</p> : null}
    </div>
  );
}

export const dynamic = "force-dynamic";
