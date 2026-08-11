import { cn } from "@/lib/utils";

/** Open-layout primitives. These exist so a section can have structure without
 *  being wrapped in a bordered rounded rectangle — the default should be a rule
 *  and a label, not a card. */

export function Section({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("min-w-0", className)} {...props}>
      {children}
    </section>
  );
}

/** Section opener: a hairline rule, a label, and optional action. No box. */
export function SectionHeader({
  label,
  title,
  action,
  className,
  rule = true,
}: {
  label?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  rule?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-3 flex items-baseline justify-between gap-4",
        rule && "border-line border-t pt-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-baseline gap-2.5">
        {label ? <span className="label shrink-0">{label}</span> : null}
        {title ? (
          <h2 className="text-ink truncate text-base font-semibold">{title}</h2>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Page title block. Deliberately small — the page title is orientation, not
 *  the main event, and should never dominate the fold. */
export function PageHeader({
  label,
  title,
  description,
  action,
  className,
  children,
}: {
  label?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className={cn("mb-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {label ? <p className="label mb-1">{label}</p> : null}
          <h1 className="text-2xl leading-tight font-semibold">{title}</h1>
          {description ? (
            <p className="text-muted mt-1.5 max-w-2xl text-base">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </header>
  );
}

/** A dense key/value row — the workhorse for stat strips and metadata. */
export function DataRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5", className)}>
      <span className="text-muted text-xs">{label}</span>
      <span className="tnum text-ink text-sm font-medium">{value}</span>
    </div>
  );
}

/** Inline stat strip: label above value, separated by space rather than boxes. */
export function StatStrip({
  items,
  className,
  size = "sm",
}: {
  items: { label: string; value: React.ReactNode; tone?: "default" | "win" | "loss" | "brand" }[];
  className?: string;
  size?: "sm" | "md";
}) {
  return (
    <dl className={cn("flex flex-wrap gap-x-8 gap-y-3", className)}>
      {items.map((item) => (
        <div key={item.label}>
          <dt className="label mb-0.5">{item.label}</dt>
          <dd
            className={cn(
              "figure-num tnum",
              size === "md" ? "text-xl" : "text-lg",
              item.tone === "win" && "text-win",
              item.tone === "loss" && "text-loss",
              item.tone === "brand" && "text-brand",
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Horizontal divider with an optional inline label. */
export function Rule({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  if (!label) return <hr className={cn("border-line", className)} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="label shrink-0">{label}</span>
      <hr className="border-line flex-1" />
    </div>
  );
}
