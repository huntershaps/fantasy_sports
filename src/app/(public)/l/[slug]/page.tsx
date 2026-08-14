import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crest } from "@/components/ui/crest";
import { Button } from "@/components/ui/button";
import {
  getPublicLeagueBySlug,
  getPublicLeagueHistory,
  getPublicSeasonStandings,
} from "@/lib/queries/public";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const league = await getPublicLeagueBySlug(slug);
  if (!league) return { title: "Not found" };
  return {
    title: `${league.name} — public archive`,
    description: league.tagline ?? `The history of ${league.name}.`,
  };
}

const record = (w: number, l: number, t: number) => (t ? `${w}–${l}–${t}` : `${w}–${l}`);
const points = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export default async function PublicLeaguePage({ params }: Props) {
  const { slug } = await params;

  // A private league is indistinguishable from one that does not exist, so
  // this page cannot be used to discover which leagues are on the platform.
  const league = await getPublicLeagueBySlug(slug);
  if (!league) notFound();

  const seasons = await getPublicLeagueHistory(league.id);
  const decided = seasons.filter((s) => s.champion);
  // The most recent season that actually has a table worth showing.
  const latest = seasons.find((s) => s._count.teams > 0);
  const standings = latest ? await getPublicSeasonStandings(league.id, latest.id) : null;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-start gap-5">
        <Crest name={league.name} src={league.logoUrl} size="3xl" />
        <div className="min-w-0 flex-1">
          <p className="label" style={{ color: league.accentColor }}>
            Public archive{league.isArchived ? " · Retired league" : ""}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-balance sm:text-4xl">{league.name}</h1>
          {league.tagline ? <p className="text-muted mt-2 text-lg">{league.tagline}</p> : null}
        </div>
      </header>

      {league.description ? (
        <p className="text-muted mt-6 max-w-2xl leading-relaxed">{league.description}</p>
      ) : null}

      <dl className="border-line mt-8 grid grid-cols-2 gap-x-8 gap-y-5 border-t pt-6 sm:grid-cols-4">
        {[
          ["Founded", String(league.foundedYear)],
          ["Seasons", String(seasons.length)],
          ["Champions crowned", String(new Set(decided.map((s) => s.champion!.id)).size)],
          ["Managers", String(league._count.memberships)],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="label mb-1">{label}</dt>
            <dd className="figure-num tnum text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      {/* Honour roll */}
      <section className="mt-14">
        <h2 className="text-xl font-semibold">Honour roll</h2>
        {decided.length ? (
          <ul className="border-line mt-5 border-t">
            {decided.map((season) => (
              <li
                key={season.id}
                className="border-line grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-4 border-b py-3.5 sm:grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)]"
              >
                <span className="figure-num tnum text-lg">{season.year}</span>
                <span className="truncate font-medium">{season.champion!.name}</span>
                {season.runnerUp ? (
                  <span className="text-muted col-start-2 truncate text-sm sm:col-start-3">
                    def. {season.runnerUp.name}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted border-line mt-5 rounded-lg border border-dashed p-6">
            No champion has been recorded yet. The first one lands at the end of the season.
          </p>
        )}
      </section>

      {/* Standings for the most recent season with data */}
      {standings && standings.rows.length ? (
        <section className="mt-14">
          <h2 className="text-xl font-semibold">{standings.season.year} standings</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted border-line border-b text-left">
                  <th scope="col" className="w-10 py-2 font-medium">#</th>
                  <th scope="col" className="py-2 font-medium">Team</th>
                  <th scope="col" className="py-2 font-medium">Manager</th>
                  <th scope="col" className="py-2 font-medium">Record</th>
                  <th scope="col" className="py-2 text-right font-medium">PF</th>
                </tr>
              </thead>
              <tbody>
                {standings.rows.map((row, i) => (
                  <tr
                    key={row.id}
                    className="border-line border-b"
                    data-champion={row.id === standings.season.championTeamId || undefined}
                  >
                    <td className="text-faint tnum py-2.5">{row.finalRank ?? row.rank ?? i + 1}</td>
                    <td className="py-2.5">
                      <span className="flex items-center gap-2.5">
                        <Crest name={row.name} src={row.logoUrl} size="xs" shape="round" />
                        <span className="truncate font-medium">{row.name}</span>
                        {row.id === standings.season.championTeamId ? (
                          <span className="label text-brand shrink-0">Champion</span>
                        ) : null}
                      </span>
                    </td>
                    <td className="text-muted truncate py-2.5">{row.manager ?? "—"}</td>
                    <td className="tnum py-2.5">{record(row.wins, row.losses, row.ties)}</td>
                    <td className="tnum py-2.5 text-right">{points(row.pointsFor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="border-line mt-16 border-t pt-8">
        <h2 className="text-lg font-semibold">This is the outside view</h2>
        <p className="text-muted mt-2 max-w-xl leading-relaxed">
          Members see the rest: every matchup, the record book, awards, rivalries, and memories
          written from their own side of the result.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="primary">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">About the museum</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
