import type { Metadata } from "next";
import Link from "next/link";
import { Medal } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Card, SectionHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Avatar } from "@/components/ui/avatar";
import { requireViewContext } from "@/lib/session";
import { getLeagueRecords, listLeagues } from "@/lib/queries/leagues";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Records" };

const CATEGORY_LABEL = {
  TEAM: "Team records",
  PLAYER: "Player records",
  MANAGER: "Manager records",
} as const;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function RecordsPage({
  searchParams,
}: {
  searchParams: Promise<{ league?: string }>;
}) {
  const { league: leagueSlug } = await searchParams;
  const { actor } = await requireViewContext();
  const leagues = await listLeagues(actor);

  if (leagues.length === 0) {
    return (
      <PageContainer className="py-10">
        <EmptyState icon={Medal} title="No leagues yet" />
      </PageContainer>
    );
  }

  const selected = leagues.find((l) => l.slug === leagueSlug) ?? leagues[0];
  const records = await getLeagueRecords(selected.id);

  const grouped = {
    TEAM: records.filter((r) => r.category === "TEAM"),
    PLAYER: records.filter((r) => r.category === "PLAYER"),
    MANAGER: records.filter((r) => r.category === "MANAGER"),
  };

  return (
    <PageContainer className="py-8 sm:py-10">
      <header className="mb-6">
        <p className="eyebrow mb-2">The book</p>
        <h1 className="text-4xl font-extrabold sm:text-5xl">Records</h1>
        <p className="text-muted mt-3 max-w-2xl">
          The highs, the lows, and exactly when each one was set.
        </p>
      </header>

      {leagues.length > 1 ? (
        <nav aria-label="League" className="mb-8 flex flex-wrap gap-2">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/records?league=${league.slug}`}
              aria-current={league.id === selected.id ? "true" : undefined}
              className={cn(
                "inline-flex h-9 items-center rounded-xl border px-3.5 text-sm font-semibold transition-colors",
                league.id === selected.id
                  ? "border-gold bg-gold text-inverse"
                  : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {league.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {records.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="No records yet"
          description="Records are computed from league history once seasons are imported."
        />
      ) : (
        <div className="space-y-10">
          {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map(
            (category) =>
              grouped[category].length > 0 ? (
                <section key={category}>
                  <SectionHeader
                    eyebrow={selected.name}
                    title={CATEGORY_LABEL[category]}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {grouped[category].map((record) => {
                      const holderName =
                        record.holderPlayer?.fullName ??
                        record.holderTeam?.name ??
                        record.holderUser?.name ??
                        "Unknown";

                      const body = (
                        <Card
                          variant="raised"
                          className="h-full p-5 transition-colors hover:border-line-strong"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="eyebrow mb-1.5">{record.label}</p>
                              <p className="stat-figure text-gold text-3xl">
                                {record.displayValue}
                              </p>
                            </div>
                            <Avatar
                              name={holderName}
                              src={record.holderUser?.image}
                              size="md"
                              rounded="card"
                            />
                          </div>

                          <p className="text-muted mt-4 text-sm leading-relaxed">
                            {record.description}
                          </p>

                          <div className="text-subtle mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <span>{dateFormat.format(record.occurredOn)}</span>
                            {record.week ? <span>· Week {record.week}</span> : null}
                            {record.previous ? (
                              <span>· Previous: {record.previous.displayValue}</span>
                            ) : null}
                          </div>
                        </Card>
                      );

                      // Records tied to a specific game link straight to it.
                      return record.matchupId ? (
                        <Link key={record.id} href={`/matchup/${record.matchupId}`}>
                          {body}
                        </Link>
                      ) : (
                        <div key={record.id}>{body}</div>
                      );
                    })}
                  </div>
                </section>
              ) : null,
          )}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
