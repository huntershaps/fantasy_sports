import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Certificate } from "@/components/awards/certificate";
import { requireViewContext } from "@/lib/session";
import { getAward } from "@/lib/queries/awards";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Award" };

/** Stat keys the engine writes; anything else falls back to a humanised key. */
const STAT_LABELS: Record<string, string> = {
  points: "Points",
  margin: "Margin",
  wins: "Wins",
  losses: "Losses",
  pointsFor: "Points for",
  streak: "Streak",
  week: "Week",
  year: "Season",
  faab: "FAAB spent",
  seedGap: "Seed gap",
  pointsGained: "Points gained",
  finalRank: "Final rank",
};

export default async function AwardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor, viewer } = await requireViewContext();

  const award = await getAward(actor, id);
  if (!award) notFound();

  const stats = Object.entries((award.stats ?? {}) as Record<string, unknown>).filter(
    ([, value]) => value !== null && value !== undefined,
  );
  const isMine = award.userId === viewer.id;

  return (
    <PageContainer className="max-w-4xl py-8 sm:py-10">
      <Link
        href="/awards"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        All awards
      </Link>

      <Card
        variant="raised"
        style={{ ["--award" as string]: award.definition.accentColor }}
        className="relative overflow-hidden p-6 sm:p-10"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            background:
              "radial-gradient(80% 100% at 20% 0%, var(--award), transparent 62%)",
          }}
        />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
          <span
            className="grid size-24 shrink-0 place-items-center rounded-3xl text-6xl"
            style={{
              backgroundColor: "color-mix(in srgb, var(--award) 16%, transparent)",
            }}
          >
            {award.definition.icon}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge tone={award.definition.tier === "SHAME" ? "ember" : "gold"} size="xs">
                {award.definition.tier}
              </Badge>
              <Badge size="xs">
                {award.season ? `${award.season.year} Season` : "All Time"}
              </Badge>
              {isMine ? (
                <Badge tone="gold" size="xs">
                  Yours
                </Badge>
              ) : null}
            </div>

            <h1 className="text-3xl leading-tight font-extrabold text-balance sm:text-4xl">
              {award.titleOverride ?? award.definition.name}
            </h1>

            <p className="text-muted mt-3 text-lg leading-relaxed">
              {award.description ?? award.definition.description}
            </p>

            {award.user ? (
              <Link
                href={`/profile/${award.user.id}`}
                className="border-line bg-surface-2 hover:border-line-strong mt-6 inline-flex items-center gap-3 rounded-xl border py-2 pr-4 pl-2 transition-colors"
              >
                <Avatar name={award.user.name} src={award.user.image} size="sm" />
                <span>
                  <span className="block text-sm font-semibold">{award.user.name}</span>
                  {award.team ? (
                    <span className="text-subtle block text-xs">{award.team.name}</span>
                  ) : null}
                </span>
              </Link>
            ) : null}
          </div>
        </div>

        {stats.length > 0 ? (
          <dl className="border-line relative mt-8 grid grid-cols-2 gap-5 border-t pt-6 sm:grid-cols-4">
            {stats.map(([key, value]) => (
              <div key={key}>
                <dt className="eyebrow mb-1">
                  {STAT_LABELS[key] ?? key.replace(/([A-Z])/g, " $1")}
                </dt>
                <dd className="stat-figure text-xl">
                  {typeof value === "number" && !Number.isInteger(value)
                    ? formatPoints(value)
                    : String(value)}
                </dd>
              </div>
            ))}
          </dl>
        ) : null}

        {award.matchup ? (
          <div className="relative mt-6">
            <Button asChild variant="outline" size="sm">
              <Link href={`/matchup/${award.matchup.id}`}>
                {award.matchup.homeTeam.name} {formatPoints(Number(award.matchup.homeScore))}
                {" – "}
                {formatPoints(Number(award.matchup.awayScore))} {award.matchup.awayTeam.name}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : null}
      </Card>

      {award.certificate ? (
        <section className="mt-12">
          <SectionHeader eyebrow="Make it official" title="Certificate" />
          <Certificate
            certificate={{
              ...award.certificate,
              icon: award.definition.icon,
              accentColor: award.definition.accentColor,
            }}
          />
          <p className="text-subtle mt-4 text-center text-sm">
            Use your browser&rsquo;s print dialog to save this as a PDF.
          </p>
        </section>
      ) : null}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
