import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { requireViewContext } from "@/lib/session";
import { listLeagues } from "@/lib/queries/leagues";

export const metadata: Metadata = { title: "Leagues" };

export default async function LeaguesPage() {
  const { actor } = await requireViewContext();
  const leagues = await listLeagues(actor);

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-8">
        <p className="eyebrow mb-2">Your leagues</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Leagues</h1>
        <p className="text-muted mt-3 max-w-2xl">
          Each league keeps its own history, records, and hall of fame.
        </p>
      </header>

      {leagues.length === 0 ? (
        <EmptyState
          icon={Shield}
          title="You are not in a league yet"
          description="Once a commissioner adds you to a league, its full history shows up here."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/league/${league.slug}`}
              style={{
                ["--accent" as string]: league.accentColor,
                ["--accent2" as string]: league.secondColor,
              }}
              className="group"
            >
              <Card
                variant="raised"
                className="relative h-full overflow-hidden transition-all duration-300 group-hover:-translate-y-0.5 group-hover:shadow-raised"
              >
                <div
                  aria-hidden
                  className="field-lines absolute inset-x-0 top-0 h-32 opacity-40"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-25"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--accent), transparent 60%, var(--accent2))",
                  }}
                />

                <div className="relative p-6">
                  <div className="mb-6 flex items-start justify-between gap-4">
                    <span
                      className="grid size-12 place-items-center rounded-2xl"
                      style={{
                        backgroundColor:
                          "color-mix(in srgb, var(--accent) 18%, transparent)",
                      }}
                    >
                      <Shield
                        className="size-6"
                        style={{ color: "var(--accent)" }}
                      />
                    </span>
                    <Badge size="sm">Est. {league.foundedYear}</Badge>
                  </div>

                  <h2 className="text-2xl leading-tight font-extrabold text-balance">
                    {league.name}
                  </h2>
                  {league.tagline ? (
                    <p className="text-muted mt-2 text-sm leading-relaxed">
                      {league.tagline}
                    </p>
                  ) : null}

                  <dl className="border-line mt-6 grid grid-cols-3 gap-4 border-t pt-5">
                    <div>
                      <dt className="eyebrow mb-1">Seasons</dt>
                      <dd className="stat-figure text-xl">{league.seasonCount}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow mb-1">Managers</dt>
                      <dd className="stat-figure text-xl">{league.managerCount}</dd>
                    </div>
                    <div>
                      <dt className="eyebrow mb-1">Current</dt>
                      <dd className="stat-figure text-xl">
                        {league.currentSeasonYear ?? "—"}
                      </dd>
                    </div>
                  </dl>

                  {league.champion ? (
                    <div className="bg-surface-2 mt-5 flex items-center gap-3 rounded-xl p-3">
                      <Trophy className="text-gold size-4 shrink-0" />
                      <p className="min-w-0 truncate text-sm">
                        <span className="text-subtle">
                          {league.champion.year} champion:{" "}
                        </span>
                        <span className="font-semibold">
                          {league.champion.managerName ?? league.champion.teamName}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
