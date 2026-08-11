import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Avatar } from "@/components/ui/avatar";
import { Section, SectionHeader } from "@/components/ui/layout";
import { Certificate } from "@/components/awards/certificate";
import { requireViewContext } from "@/lib/session";
import { getAward } from "@/lib/queries/awards";
import { formatPoints } from "@/lib/utils";

export const metadata: Metadata = { title: "Award" };

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
    <PageContainer width="narrow" className="py-6">
      <Link
        href="/awards"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="size-3.5" />
        Trophy case
      </Link>

      {/* The award presented as an object on a plinth, then explained. */}
      <div
        style={{ ["--award" as string]: award.definition.accentColor }}
        className="border-line flex flex-col items-center border-y py-10 text-center"
      >
        <span className="text-6xl">{award.definition.icon}</span>
        <span
          aria-hidden
          className="mt-5 h-px w-16"
          style={{ backgroundColor: "color-mix(in srgb, var(--award) 60%, transparent)" }}
        />
        <p className="label mt-4">
          {award.season ? `${award.season.year} Season` : "All time"}
          {isMine ? " · Yours" : ""}
        </p>
        <h1 className="font-display mt-2 text-xl leading-tight font-semibold text-balance sm:text-2xl">
          {award.titleOverride ?? award.definition.name}
        </h1>
        <p className="text-muted mt-3 max-w-md text-md leading-relaxed">
          {award.description ?? award.definition.description}
        </p>

        {award.user ? (
          <Link
            href={`/profile/${award.user.id}`}
            className="hover:bg-surface-2 mt-6 flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors"
          >
            <Avatar name={award.user.name} src={award.user.image} size="sm" rounded="full" />
            <span className="text-left">
              <span className="block text-sm font-medium">{award.user.name}</span>
              {award.team ? (
                <span className="text-faint block text-xs">{award.team.name}</span>
              ) : null}
            </span>
          </Link>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <dl className="border-line grid grid-cols-2 gap-x-8 gap-y-4 border-b py-4 sm:grid-cols-4">
          {stats.map(([key, value]) => (
            <div key={key}>
              <dt className="label mb-0.5">
                {STAT_LABELS[key] ?? key.replace(/([A-Z])/g, " $1")}
              </dt>
              <dd className="figure-num tnum text-base">
                {typeof value === "number" && !Number.isInteger(value)
                  ? formatPoints(value)
                  : String(value)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {award.matchup ? (
        <Link
          href={`/matchup/${award.matchup.id}`}
          className="border-line hover:bg-surface -mx-3 mt-4 flex items-baseline gap-3 border-b px-3 py-3 transition-colors"
        >
          <span className="label shrink-0">The game</span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {award.matchup.homeTeam.name} {formatPoints(Number(award.matchup.homeScore))}
            {" – "}
            {formatPoints(Number(award.matchup.awayScore))} {award.matchup.awayTeam.name}
          </span>
          <span className="text-brand shrink-0 text-xs">View →</span>
        </Link>
      ) : null}

      {award.certificate ? (
        <Section className="mt-10">
          <SectionHeader label="Certificate" />
          <Certificate
            certificate={{
              ...award.certificate,
              icon: award.definition.icon,
              accentColor: award.definition.accentColor,
            }}
          />
          <p className="text-faint mt-3 text-center text-xs">
            Print to PDF to keep a copy.
          </p>
        </Section>
      ) : null}
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
