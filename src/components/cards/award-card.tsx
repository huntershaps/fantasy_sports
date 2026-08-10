import Link from "next/link";
import type { AwardTier } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
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

const TIER_LABEL: Record<AwardTier, string> = {
  LEGENDARY: "Legendary",
  GOLD: "Gold",
  SILVER: "Silver",
  BRONZE: "Bronze",
  SHAME: "Hall of Shame",
  FUN: "Curiosity",
};

export function AwardCard({
  award,
  className,
}: {
  award: AwardCardData;
  className?: string;
}) {
  const isLegendary = award.tier === "LEGENDARY";

  return (
    <Link
      href={`/awards/${award.id}`}
      // The per-award accent is data, not a Tailwind class, so it comes in as
      // a custom property the card's gradients and rings read from.
      style={{ ["--award" as string]: award.accentColor }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border p-5 transition-all duration-300",
        "border-line bg-surface hover:-translate-y-0.5 hover:shadow-raised focus-visible:border-gold",
        isLegendary && "border-[color:var(--award)]/40",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.10] transition-opacity duration-300 group-hover:opacity-[0.18]"
        style={{
          background:
            "radial-gradient(120% 90% at 50% -10%, var(--award), transparent 62%)",
        }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span
          className="grid size-14 place-items-center rounded-2xl text-3xl transition-transform duration-300 group-hover:scale-110"
          style={{ backgroundColor: "color-mix(in srgb, var(--award) 14%, transparent)" }}
        >
          {award.icon}
        </span>
        <Badge
          size="xs"
          tone={award.tier === "SHAME" ? "ember" : isLegendary ? "gold" : "neutral"}
        >
          {TIER_LABEL[award.tier]}
        </Badge>
      </div>

      <div className="relative mt-4 flex-1">
        <p className="eyebrow mb-1.5">{award.seasonLabel}</p>
        <h3 className="text-lg leading-tight font-bold text-balance">{award.name}</h3>
        {award.recipientName ? (
          <p
            className="mt-2 text-sm font-semibold"
            style={{ color: "var(--award)" }}
          >
            {award.recipientName}
          </p>
        ) : null}
        {award.teamName ? (
          <p className="text-subtle truncate text-xs">{award.teamName}</p>
        ) : null}
        <p className="text-muted mt-3 line-clamp-2 text-sm leading-relaxed">
          {award.description}
        </p>
      </div>

      {award.hasCertificate ? (
        <p className="text-subtle relative mt-4 text-[11px] font-semibold tracking-wide uppercase">
          Certificate available
        </p>
      ) : null}
    </Link>
  );
}
