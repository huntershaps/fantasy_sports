import Image from "next/image";
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
  xl: "size-20 text-xl",
  "2xl": "size-28 text-3xl",
} as const;

/** Deterministic tint per name so unclaimed teams still look intentional. */
const tints = [
  "bg-gold-wash text-gold",
  "bg-field-wash text-field",
  "bg-ice-wash text-ice",
  "bg-violet-wash text-violet",
  "bg-ember-wash text-ember",
];

function tintFor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return tints[Math.abs(hash) % tints.length];
}

export function Avatar({
  name,
  src,
  size = "md",
  className,
  rounded = "full",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
  rounded?: "full" | "card";
}) {
  const shape = rounded === "full" ? "rounded-full" : "rounded-xl";

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={112}
        height={112}
        className={cn(
          "border-line shrink-0 border object-cover",
          shape,
          sizes[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center font-bold",
        shape,
        sizes[size],
        tintFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
