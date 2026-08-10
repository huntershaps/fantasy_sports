import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarClock,
  Flame,
  ListPlus,
  Medal,
  Swords,
  Trophy,
  UserMinus,
  Zap,
} from "lucide-react";
import type { MemoryType } from "@/generated/prisma/enums";
import type { MemoryCardData } from "@/lib/queries/memories";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLE: Record<
  MemoryType,
  { icon: React.ComponentType<{ className?: string }>; wash: string; text: string; label: string }
> = {
  CHAMPIONSHIP: { icon: Trophy, wash: "bg-gold-wash", text: "text-gold", label: "Championship" },
  RECORD: { icon: Medal, wash: "bg-ember-wash", text: "text-ember", label: "Record" },
  MATCHUP: { icon: Swords, wash: "bg-ice-wash", text: "text-ice", label: "Matchup" },
  PLAYER_PERFORMANCE: { icon: Flame, wash: "bg-ember-wash", text: "text-ember", label: "Performance" },
  TRADE: { icon: ArrowLeftRight, wash: "bg-violet-wash", text: "text-violet", label: "Trade" },
  WAIVER: { icon: ListPlus, wash: "bg-field-wash", text: "text-field", label: "Waiver" },
  DROP: { icon: UserMinus, wash: "bg-surface-3", text: "text-subtle", label: "Drop" },
  DRAFT: { icon: CalendarClock, wash: "bg-ice-wash", text: "text-ice", label: "Draft" },
  MILESTONE: { icon: Medal, wash: "bg-gold-wash", text: "text-gold", label: "Milestone" },
  STREAK: { icon: Zap, wash: "bg-field-wash", text: "text-field", label: "Streak" },
  RIVALRY: { icon: Swords, wash: "bg-violet-wash", text: "text-violet", label: "Rivalry" },
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function MemoryCard({
  memory,
  showLeague = false,
  className,
}: {
  memory: MemoryCardData;
  showLeague?: boolean;
  className?: string;
}) {
  const style = STYLE[memory.type] ?? STYLE.MATCHUP;
  const Icon = style.icon;

  return (
    <Link
      href={`/memories/${memory.id}`}
      className={cn(
        "border-line bg-surface rounded-card group relative flex gap-4 border p-4 transition-all",
        "hover:border-line-strong hover:bg-surface-2 focus-visible:border-gold",
        // Personal memories get a gold spine so "your" history reads at a glance.
        memory.rendered.isPersonal && "border-l-gold border-l-2",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-xl transition-transform group-hover:scale-105",
          style.wash,
        )}
      >
        <Icon className={cn("size-[18px]", style.text)} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="eyebrow">{style.label}</span>
          <span className="text-subtle text-[11px]">
            {dateFormat.format(memory.occurredOn)}
          </span>
          {showLeague ? (
            <span className="text-subtle truncate text-[11px]">· {memory.leagueName}</span>
          ) : null}
        </div>

        <p className="leading-snug font-semibold text-pretty">
          {memory.rendered.text}
        </p>

        {memory.rendered.detail ? (
          <p className="text-muted mt-1.5 text-sm">{memory.rendered.detail}</p>
        ) : null}
      </div>

      {memory.rendered.isPersonal ? (
        <Badge tone="gold" size="xs" className="absolute top-3 right-3">
          You
        </Badge>
      ) : null}
    </Link>
  );
}

export function MemoryCardSkeletonRow() {
  return (
    <div className="border-line bg-surface rounded-card flex gap-4 border p-4">
      <div className="bg-surface-2 size-10 shrink-0 animate-pulse rounded-xl" />
      <div className="flex-1 space-y-2">
        <div className="bg-surface-2 h-3 w-24 animate-pulse rounded" />
        <div className="bg-surface-2 h-4 w-3/4 animate-pulse rounded" />
        <div className="bg-surface-2 h-3 w-1/3 animate-pulse rounded" />
      </div>
    </div>
  );
}
