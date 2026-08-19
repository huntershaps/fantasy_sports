import type { Metadata } from "next";
import Link from "next/link";
import { Crest } from "@/components/ui/crest";
import { listPublicLeagues } from "@/lib/queries/public";

export const metadata: Metadata = {
  title: "Public archives",
  description: "Fantasy leagues that have published their history.",
};

/**
 * The index of published leagues.
 *
 * Only leagues whose commissioner has switched on `isPublic` appear — the
 * query filters on it, so a private league is not merely unlinked here, it is
 * unreachable. That is what makes this safe to show to anyone: the list is
 * opt-in rather than opt-out.
 */
export default async function PublicLeagueIndex() {
  const leagues = await listPublicLeagues();
  const active = leagues.filter((l) => !l.isArchived);
  const retired = leagues.filter((l) => l.isArchived);

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6">
      <header className="max-w-2xl">
        <p className="label">Public archives</p>
        <h1 className="mt-1 text-3xl font-semibold text-balance sm:text-4xl">
          Leagues that kept their history
        </h1>
        <p className="text-muted mt-3 leading-relaxed">
          Every league below chose to publish its record: champions, standings and the
          seasons behind them. No account needed to read one.
        </p>
      </header>

      {leagues.length === 0 ? (
        <div className="border-line text-muted mt-10 rounded-lg border border-dashed px-6 py-12 text-center">
          <p className="text-ink font-medium">No public archives yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed">
            Leagues are private by default. A commissioner can publish one from the
            league&rsquo;s admin settings, and it will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          <LeagueGrid leagues={active} />
          {retired.length > 0 ? (
            <section>
              <h2 className="label border-line border-b pb-2">Retired leagues</h2>
              <div className="mt-5">
                <LeagueGrid leagues={retired} />
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}

type PublicLeague = Awaited<ReturnType<typeof listPublicLeagues>>[number];

function LeagueGrid({ leagues }: { leagues: PublicLeague[] }) {
  if (leagues.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {leagues.map((league) => (
        <li key={league.slug}>
          <Link
            href={`/l/${league.slug}`}
            className="border-line hover:border-line-strong hover:bg-surface group block h-full rounded-lg border p-4 transition-colors"
          >
            <div className="flex items-start gap-3">
              <Crest name={league.name} src={league.logoUrl} size="xl" />
              <div className="min-w-0 flex-1">
                <p className="label" style={{ color: league.accentColor }}>
                  Est. {league.foundedYear}
                </p>
                <p className="mt-0.5 truncate font-semibold">{league.name}</p>
                {league.tagline ? (
                  <p className="text-muted mt-1 line-clamp-2 text-sm">{league.tagline}</p>
                ) : null}
              </div>
            </div>

            <dl className="border-line text-muted mt-4 flex gap-6 border-t pt-3 text-xs">
              <div>
                <dt className="sr-only">Seasons</dt>
                <dd>
                  <span className="text-ink tnum font-medium">{league._count.seasons}</span>{" "}
                  {league._count.seasons === 1 ? "season" : "seasons"}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Managers</dt>
                <dd>
                  <span className="text-ink tnum font-medium">{league._count.memberships}</span>{" "}
                  {league._count.memberships === 1 ? "manager" : "managers"}
                </dd>
              </div>
            </dl>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const dynamic = "force-dynamic";
