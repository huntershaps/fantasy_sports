import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils";

const button = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-gold text-inverse shadow-card hover:bg-gold/90 font-semibold",
        accent:
          "bg-accent text-inverse shadow-card hover:brightness-110 font-semibold",
        solid: "bg-ink text-inverse hover:bg-ink/90 font-semibold",
        outline:
          "border border-line-strong bg-transparent text-ink hover:bg-surface-2 hover:border-line-strong",
        subtle: "bg-surface-2 text-ink hover:bg-surface-3",
        ghost: "text-muted hover:bg-surface-2 hover:text-ink",
        danger: "bg-ember text-white hover:bg-ember/90 font-semibold",
        link: "text-gold underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-8 rounded-lg px-3 text-[13px] [&_svg]:size-3.5",
        md: "h-10 rounded-xl px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-xl px-6 text-[15px] [&_svg]:size-[18px]",
        icon: "size-10 rounded-xl [&_svg]:size-[18px]",
        "icon-sm": "size-8 rounded-lg [&_svg]:size-4",
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
  return (
    <Comp className={cn(button({ variant, size }), className)} {...props} />
  );
}

export { button as buttonVariants };
