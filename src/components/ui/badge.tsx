import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1 rounded-sm font-medium whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "bg-surface-3 text-muted",
        brand: "bg-brand-dim/30 text-brand",
        win: "text-win",
        loss: "text-loss",
        info: "text-info",
        outline: "border border-line-strong text-muted",
      },
      size: {
        xs: "h-4 px-1.5 text-2xs",
        sm: "h-5 px-1.5 text-xs",
      },
    },
    defaultVariants: { tone: "neutral", size: "sm" },
  },
);

export function Badge({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone, size }), className)} {...props} />;
}

/** Compact form indicator. Letters rather than filled circles — a run of
 *  results should read as a sequence, not a row of traffic lights. */
export function FormStrip({
  results,
  className,
}: {
  results: ("W" | "L" | "T")[];
  className?: string;
}) {
  if (results.length === 0) {
    return <span className="text-faint text-xs">No games</span>;
  }
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`Recent form: ${results.join(", ")}`}
    >
      {results.map((result, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "grid size-4 place-items-center rounded-[3px] text-2xs font-semibold",
            result === "W"
              ? "bg-win/15 text-win"
              : result === "L"
                ? "bg-loss/15 text-loss"
                : "bg-surface-3 text-faint",
          )}
        >
          {result}
        </span>
      ))}
    </span>
  );
}

/** Streak reads as data, so it stays in the text colour unless it is notable. */
export function Streak({
  type,
  length,
  className,
}: {
  type: "W" | "L" | "T" | null;
  length: number;
  className?: string;
}) {
  if (!type || length === 0) return <span className="text-faint">—</span>;
  return (
    <span
      className={cn(
        "tnum font-medium",
        length >= 3 && type === "W" && "text-win",
        length >= 3 && type === "L" && "text-loss",
        className,
      )}
    >
      {type}
      {length}
    </span>
  );
}
