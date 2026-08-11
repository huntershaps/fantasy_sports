import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-medium transition-colors duration-100 disabled:pointer-events-none disabled:opacity-40 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-brand text-inverse hover:bg-brand-hi",
        solid: "bg-ink text-inverse hover:opacity-90",
        outline:
          "border border-line-strong text-ink hover:bg-surface-2 hover:border-line-strong",
        subtle: "bg-surface-2 text-ink hover:bg-surface-3",
        ghost: "text-muted hover:bg-surface-2 hover:text-ink",
        danger: "bg-loss text-white hover:opacity-90",
        link: "text-brand h-auto p-0 underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-2xs [&_svg]:size-3",
        sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        md: "h-8 px-3 text-sm [&_svg]:size-3.5",
        lg: "h-10 px-4 text-base [&_svg]:size-4",
        icon: "size-8 [&_svg]:size-4",
        "icon-sm": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "subtle", size: "md" },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof button> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(button({ variant, size }), className)} {...props} />;
}

export { button as buttonVariants };
