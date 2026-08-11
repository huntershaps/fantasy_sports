import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Cards are for genuinely detachable objects — an award, a certificate, a
 *  single matchup. Sections and lists should use the open-layout primitives in
 *  layout.tsx instead of being wrapped in a box. */
const card = cva("relative min-w-0 rounded-lg transition-colors duration-100", {
  variants: {
    variant: {
      plain: "bg-surface",
      bordered: "border-line border bg-surface",
      inset: "bg-surface-2",
    },
    interactive: {
      true: "hover:border-line-strong hover:bg-surface-2 focus-visible:border-brand",
      false: "",
    },
  },
  defaultVariants: { variant: "bordered", interactive: false },
});

export function Card({
  className,
  variant,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof card>) {
  return <div className={cn(card({ variant, interactive }), className)} {...props} />;
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "border-line flex items-center justify-between gap-3 border-b px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("border-line flex items-center gap-3 border-t px-4 py-2.5", className)}
      {...props}
    />
  );
}
