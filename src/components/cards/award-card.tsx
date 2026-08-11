import Link from "next/link";
import type { AwardTier } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export type AwardCardData = {
  id: string;
  icon: string;
  name: string;
  tier: AwardTier;
  accentColor: string;
  description: string;
  recipientName: string | null;
  teamName: string | null;
  seasonLabel: string;
  hasCertificate: boolean;
};

/** A plinth in a trophy case: the mark sits on a shelf with an engraved
 *  caption underneath. The description is held back until hover so a wall of
 *  awards reads as objects rather than paragraphs. */
export function AwardCard({
  award,
  className,
}: {
  award: AwardCardData;
  className?: string;
}) {
  const isTop = award.tier === "LEGENDARY";
  const isShame = award.tier === "SHAME";

  return (
    <Link
      href={`/awards/${award.id}`}
      style={{ ["--award" as string]: award.accentColor }}
      className={cn(
        "group border-line hover:border-line-strong relative flex flex-col rounded-md border transition-colors",
        isTop && "border-[color:var(--award)]/40",
        className,
      )}
    >
      <div className="flex flex-1 flex-col items-center px-4 pt-6 pb-4 text-center">
        <span
          className={cn(
            "text-4xl transition-transform duration-200 group-hover:-translate-y-0.5",
            isShame && "opacity-70 grayscale",
          )}
        >
          {award.icon}
        </span>

        {/* The shelf. */}
        <span
          aria-hidden
          className="mt-4 h-px w-10"
          style={{ backgroundColor: "color-mix(in srgb, var(--award) 60%, transparent)" }}
        />

        <p className="text-ink mt-3 text-sm leading-tight font-semibold text-balance">
          {award.name}
        </p>
        {award.recipientName ? (
          <p className="text-muted mt-1 truncate text-xs">{award.recipientName}</p>
        ) : null}
      </div>

      <div className="border-line flex items-baseline justify-between gap-2 border-t px-3 py-2">
        <span className="label truncate">{award.seasonLabel}</span>
        {award.hasCertificate ? (
          <span className="text-faint shrink-0 text-2xs">Certificate</span>
        ) : null}
      </div>
    </Link>
  );
}

/** Groups awards under a season heading, the way a cabinet is arranged. */
export function TrophyCase({
  groups,
  className,
}: {
  groups: { label: string; awards: AwardCardData[] }[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {groups.map((group) => (
        <section key={group.label}>
          <div className="border-line mb-3 flex items-baseline gap-3 border-t pt-3">
            <h2 className="label">{group.label}</h2>
            <span className="text-faint text-xs">{group.awards.length}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {group.awards.map((award) => (
              <AwardCard key={award.id} award={award} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
