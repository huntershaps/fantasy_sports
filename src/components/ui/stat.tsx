import { cn } from "@/lib/utils";

const sizes = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

const tones = {
  default: "text-ink",
  brand: "text-brand",
  win: "text-win",
  loss: "text-loss",
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
      <p className="label mb-1">{label}</p>
      <p className={cn("figure-num tnum", sizes[size], tones[tone])}>{value}</p>
      {sub ? <p className="text-faint mt-0.5 truncate text-xs">{sub}</p> : null}
    </div>
  );
}

/** Stats separated by whitespace and hairlines rather than boxed cells. */
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
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[columns];

  return (
    <div
      className={cn(
        "border-line divide-line grid divide-x border-y",
        "[&>*]:px-4 [&>*]:py-3 [&>*:first-child]:pl-0",
        cols,
        className,
      )}
    >
      {children}
    </div>
  );
}
