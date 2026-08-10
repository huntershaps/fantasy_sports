import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const card = cva("relative rounded-card border transition-colors", {
  variants: {
    variant: {
      flat: "border-line bg-surface",
      raised: "border-line bg-surface shadow-card",
      glass:
        "border-white/10 bg-surface/70 shadow-card backdrop-blur-xl supports-[backdrop-filter]:bg-surface/60",
      outline: "border-line bg-transparent",
    },
    interactive: {
      true: "cursor-pointer hover:border-line-strong hover:bg-surface-2 focus-visible:border-gold",
      false: "",
    },
  },
  defaultVariants: { variant: "raised", interactive: false },
});

export function Card({
  className,
  variant,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof card>) {
  return (
    <div
      className={cn(card({ variant, interactive }), className)}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-5 pb-3",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-base leading-tight font-semibold", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-muted text-sm leading-relaxed", className)} {...props} />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("px-5 pb-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-line flex items-center gap-3 border-t px-5 py-3.5",
        className,
      )}
      {...props}
    />
  );
}

/** Section heading used above card grids across the app. */
export function SectionHeader({
  eyebrow,
  title,
  action,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
        <h2 className="truncate text-xl font-bold sm:text-2xl">{title}</h2>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
