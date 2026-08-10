import { cn } from "@/lib/utils";

const sizes = {
  sm: "text-2xl",
  md: "text-[2rem] sm:text-4xl",
  lg: "text-4xl sm:text-5xl",
  xl: "text-5xl sm:text-7xl",
} as const;

const tones = {
  default: "text-ink",
  gold: "text-gold",
  field: "text-field",
  ember: "text-ember",
  ice: "text-ice",
  muted: "text-muted",
} as const;

export function Stat({
  label,
  value,
  sub,
  size = "md",
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  size?: keyof typeof sizes;
  tone?: keyof typeof tones;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="eyebrow mb-1.5">{label}</p>
      <p className={cn("stat-figure", sizes[size], tones[tone])}>{value}</p>
      {sub ? <p className="text-subtle mt-1.5 text-xs">{sub}</p> : null}
    </div>
  );
}

/** Responsive grid of stats with hairline dividers — the career/season stat strip. */
export function StatGrid({
  className,
  children,
  columns = 4,
}: {
  className?: string;
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
}) {
  const cols = {
    2: "grid-cols-2",
    3: "grid-cols-2 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div
      className={cn(
        "divide-line border-line grid divide-x divide-y overflow-hidden rounded-card border",
        "[&>*]:p-4 sm:[&>*]:p-5",
        cols,
        className,
      )}
    >
      {children}
    </div>
  );
}
