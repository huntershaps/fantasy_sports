import Image from "next/image";
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-2xs",
  lg: "size-10 text-xs",
  xl: "size-14 text-base",
  "2xl": "size-20 text-xl",
} as const;

/** Monogram crests rather than coloured circles. A team identity should look
 *  like a badge on a jersey, not a chat avatar. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
  rounded = "md",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  rounded?: "full" | "md";
}) {
  const shape = rounded === "full" ? "rounded-full" : "rounded-md";

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={80}
        height={80}
        className={cn("border-line shrink-0 border object-cover", shape, sizes[size], className)}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "bg-surface-3 text-muted border-line grid shrink-0 place-items-center border font-semibold tracking-wide",
        shape,
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
