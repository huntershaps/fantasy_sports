import Link from "next/link";
import type { MemoryType } from "@/generated/prisma/enums";
import type { MemoryCardData } from "@/lib/queries/memories";
import { cn } from "@/lib/utils";

const TYPE_LABEL: Record<MemoryType, string> = {
  CHAMPIONSHIP: "Championship",
  RECORD: "Record",
  MATCHUP: "Result",
  PLAYER_PERFORMANCE: "Performance",
  TRADE: "Trade",
  WAIVER: "Waiver",
  DROP: "Drop",
  DRAFT: "Draft",
  MILESTONE: "Milestone",
  STREAK: "Streak",
  RIVALRY: "Rivalry",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

/** An entry in the archive. A dated line and a sentence — no box, no icon
 *  tile. The text is the object; chrome would only get in its way. */
export function MemoryEntry({
  memory,
  showLeague = false,
  className,
}: {
  memory: MemoryCardData;
  showLeague?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/memories/${memory.id}`}
      className={cn(
        "group border-line hover:bg-surface/60 block border-b py-3.5 transition-colors last:border-b-0",
        className,
      )}
    >
      <div className="text-faint mb-1 flex flex-wrap items-baseline gap-x-2 text-xs">
        <time dateTime={memory.occurredOn.toISOString()} className="tnum">
          {dateFormat.format(memory.occurredOn)}
        </time>
        <span aria-hidden>·</span>
        <span className="label">{TYPE_LABEL[memory.type] ?? "Event"}</span>
        {showLeague ? (
          <>
            <span aria-hidden>·</span>
            <span className="truncate">{memory.leagueName}</span>
          </>
        ) : null}
        {memory.rendered.isPersonal ? (
          <span className="text-brand ml-auto shrink-0 font-medium">You</span>
        ) : null}
      </div>

      <p
        className={cn(
          "group-hover:text-brand text-base leading-snug transition-colors text-pretty",
          memory.importance >= 90 ? "text-ink font-semibold" : "text-ink font-medium",
        )}
      >
        {memory.rendered.text}
      </p>

      {memory.rendered.detail ? (
        <p className="text-muted mt-0.5 text-xs">{memory.rendered.detail}</p>
      ) : null}
    </Link>
  );
}

/** The one memory that gets editorial treatment — larger type, more air,
 *  a standfirst. Used at most once per screen. */
export function FeaturedMemory({
  memory,
  label = "Featured memory",
  className,
}: {
  memory: MemoryCardData;
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href={`/memories/${memory.id}`}
      className={cn("group block", className)}
    >
      <p className="label mb-2.5">{label}</p>
      <p className="text-faint tnum mb-2 text-xs">
        {dateFormat.format(memory.occurredOn)}
        {memory.week ? ` · Week ${memory.week}` : ""} · {memory.leagueName}
      </p>
      <p className="group-hover:text-brand font-display text-xl leading-tight font-semibold text-balance transition-colors sm:text-2xl">
        {memory.rendered.text}
      </p>
      {memory.rendered.detail ? (
        <p className="text-muted mt-2 text-md">{memory.rendered.detail}</p>
      ) : null}
    </Link>
  );
}

export { MemoryEntry as MemoryCard };
