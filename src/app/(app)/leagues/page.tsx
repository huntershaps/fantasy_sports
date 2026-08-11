import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requireViewContext } from "@/lib/session";
import { listLeagues } from "@/lib/queries/leagues";

export const metadata: Metadata = { title: "Leagues" };

export default async function LeaguesPage() {
  const { actor } = await requireViewContext();
  const leagues = await listLeagues(actor);

  return (
    <PageContainer className="py-6">
      <PageHeader
        label="Your leagues"
        title="Leagues"
        description="Each league keeps its own history, records, and hall of fame."
      />

      {leagues.length === 0 ? (
        <EmptyState
          title="You are not in a league yet"
          description="Once a commissioner adds you to a league, its full history shows up here."
        />
      ) : (
        <ul className="border-line divide-line divide-y border-t">
          {leagues.map((league) => (
            <li key={league.id}>
              <Link
                href={`/league/${league.slug}`}
                className="group hover:bg-surface -mx-3 flex flex-wrap items-center gap-x-6 gap-y-3 px-3 py-4 transition-colors"
              >
                <span
                  aria-hidden
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: league.accentColor }}
                />

                <div className="min-w-[14rem] flex-1">
                  <p className="group-hover:text-brand text-lg font-semibold transition-colors">
                    {league.name}
                  </p>
                  {league.tagline ? (
                    <p className="text-muted mt-0.5 text-sm">{league.tagline}</p>
                  ) : null}
                </div>

                <dl className="flex items-end gap-x-7">
                  <Metric label="Est." value={String(league.foundedYear)} />
                  <Metric label="Seasons" value={String(league.seasonCount)} />
                  <Metric label="Managers" value={String(league.managerCount)} />
                </dl>

                {league.champion ? (
                  <div className="min-w-[11rem] text-right">
                    <p className="label mb-0.5 flex items-center justify-end gap-1">
                      <Trophy className="text-brand size-3" />
                      {league.champion.year} champion
                    </p>
                    <p className="truncate text-sm font-medium">
                      {league.champion.managerName ?? league.champion.teamName}
                    </p>
                  </div>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className="figure-num tnum text-base">{value}</dd>
    </div>
  );
}

export const dynamic = "force-dynamic";
