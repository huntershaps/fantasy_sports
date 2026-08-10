import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-muted",
        gold: "border-gold/30 bg-gold-wash text-gold",
        field: "border-field/30 bg-field-wash text-field",
        ember: "border-ember/30 bg-ember-wash text-ember",
        ice: "border-ice/30 bg-ice-wash text-ice",
        violet: "border-violet/30 bg-violet-wash text-violet",
        solid: "border-transparent bg-ink text-inverse",
      },
      size: {
        xs: "h-5 px-2 text-[10px] tracking-wide uppercase",
        sm: "h-6 px-2.5 text-[11px]",
        md: "h-7 px-3 text-xs",
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

/** Win/Loss/Tie pill used on matchup cards and schedules. */
export function ResultBadge({
  result,
  className,
}: {
  result: "W" | "L" | "T";
  className?: string;
}) {
  const tone = result === "W" ? "field" : result === "L" ? "ember" : "neutral";
  return (
    <Badge
      tone={tone}
      size="xs"
      className={cn("size-5 justify-center px-0 font-bold", className)}
      aria-label={result === "W" ? "Win" : result === "L" ? "Loss" : "Tie"}
    >
      {result}
    </Badge>
  );
}
