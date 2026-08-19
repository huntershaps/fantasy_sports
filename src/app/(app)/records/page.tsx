import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/shell/app-shell";
import { PageHeader, Section, SectionHeader } from "@/components/ui/layout";
import { EmptyState } from "@/components/ui/empty-state";
import { Crest } from "@/components/ui/crest";
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
      <PageContainer className="py-6">
        <EmptyState title="No leagues yet" />
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
    <PageContainer className="py-6">
      <PageHeader
        label="The book"
        title="Records"
        description="The highs, the lows, and exactly when each one was set."
      />

      {leagues.length > 1 ? (
        <nav aria-label="League" className="mb-6 flex flex-wrap gap-1">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={`/records?league=${league.slug}`}
              aria-current={league.id === selected.id ? "true" : undefined}
              className={cn(
                "inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                league.id === selected.id
                  ? "bg-surface-3 text-ink"
                  : "text-muted hover:bg-surface-2 hover:text-ink",
              )}
            >
              {league.name}
            </Link>
          ))}
        </nav>
      ) : null}

      {records.length === 0 ? (
        <EmptyState
          title="No records yet"
          description="Records are computed from league history once seasons are imported."
        />
      ) : (
        <div className="space-y-8">
          {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((category) =>
            grouped[category].length > 0 ? (
              <Section key={category}>
                <SectionHeader label={CATEGORY_LABEL[category]} />
                <ul className="border-line divide-line divide-y border-t">
                  {grouped[category].map((record) => {
                    const holder =
                      record.holderPlayer?.fullName ??
                      record.holderTeam?.name ??
                      record.holderUser?.name ??
                      "Unknown";

                    // A record held by a team gets that team's crest; one held
                    // by a manager gets theirs. A player record has no crest to
                    // show, so it keeps the plain name.
                    const crest = record.holderTeam
                      ? { name: record.holderTeam.name, src: record.holderTeam.logoUrl }
                      : record.holderUser
                        ? { name: record.holderUser.name, src: record.holderUser.image }
                        : null;

                    const content = (
                      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 py-3">
                        <span className="figure-num tnum text-brand w-24 shrink-0 text-xl">
                          {record.displayValue}
                        </span>
                        <div className="min-w-[12rem] flex-1">
                          <p className="text-ink text-sm font-medium">{record.label}</p>
                          <p className="text-muted text-xs">{record.description}</p>
                        </div>
                        <div className="text-faint flex shrink-0 items-center gap-2 text-right text-xs">
                          {crest ? (
                            <Crest
                              name={crest.name}
                              src={crest.src}
                              size="sm"
                              shape="round"
                            />
                          ) : null}
                          <div>
                          <p>{holder}</p>
                          <p className="tnum">
                            {dateFormat.format(record.occurredOn)}
                            {record.week ? ` · Wk ${record.week}` : ""}
                          </p>
                          </div>
                        </div>
                      </div>
                    );

                    return (
                      <li key={record.id}>
                        {record.matchupId ? (
                          <Link
                            href={`/matchup/${record.matchupId}`}
                            className="hover:bg-surface -mx-3 block px-3 transition-colors"
                          >
                            {content}
                          </Link>
                        ) : (
                          content
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            ) : null,
          )}
        </div>
      )}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
