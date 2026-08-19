import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/shell/app-shell";
import { LeagueHeader } from "@/components/league/league-header";
import { StandingsTable } from "@/components/league/standings-table";
import { Section, SectionHeader } from "@/components/ui/layout";
import { requireViewContext } from "@/lib/session";
import { getLeagueBySlug, getSeasonStandings } from "@/lib/queries/leagues";
import { db } from "@/lib/db";
import { formatPoints } from "@/lib/utils";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ season?: string }>;
};

export const metadata: Metadata = { title: "Standings" };

export default async function StandingsPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { season: seasonParam } = await searchParams;
  const { actor, viewer } = await requireViewContext();

  const league = await getLeagueBySlug(actor, slug);
  if (!league) notFound();

  const selectedYear = seasonParam ? Number(seasonParam) : league.seasons[0]?.year;
  const season = league.seasons.find((s) => s.year === selectedYear) ?? league.seasons[0];
  if (!season) notFound();

  const [standings, seasonRow] = await Promise.all([
    getSeasonStandings(season.id),
    db.season.findUnique({
      where: { id: season.id },
      select: {
        championTeamId: true,
        champion: {
          select: {
            name: true,
            memberships: { include: { user: { select: { name: true } } } },
          },
        },
      },
    }),
  ]);

  const totalPoints = standings.reduce((sum, row) => sum + row.pointsFor, 0);
  const average = standings.length > 0 ? totalPoints / standings.length : 0;

  return (
    <div style={{ ["--c-league" as string]: league.accentColor }}>
      <LeagueHeader
        slug={league.slug}
        name={league.name}
        logoUrl={league.logoUrl}
        tagline={league.tagline}
        accentColor={league.accentColor}
        foundedYear={league.foundedYear}
        seasonCount={league.seasons.length}
        managerCount={league._count.memberships}
        currentTab="standings"
        seasons={league.seasons}
        activeYear={season.year}
        championLine={
          seasonRow?.champion?.memberships[0]?.user.name ??
          seasonRow?.champion?.name ??
          null
        }
      />

      <PageContainer width="wide" className="py-6">
        <Section>
          <SectionHeader
            label={`${season.year} season`}
            rule={false}
            action={
              <span className="text-faint text-xs">
                League average {formatPoints(average)} PF
              </span>
            }
          />
          <StandingsTable
            rows={standings}
            playoffCutoff={league.settings?.playoffTeamCount ?? 6}
            highlightUserId={viewer.id}
            championTeamId={seasonRow?.championTeamId}
          />
          <p className="text-faint mt-3 text-xs">
            The rule marks the playoff cut line
            {league.settings?.playoffTeamCount
              ? ` — top ${league.settings.playoffTeamCount} qualify.`
              : "."}
          </p>
        </Section>
      </PageContainer>
    </div>
  );
}

export const dynamic = "force-dynamic";
