import { Crest, type CrestSize } from "@/components/ui/crest";

/** Kept as a thin alias so every existing call site renders the crest system.
 *  New code should import Crest directly. */
export function Avatar({
  name,
  src,
  size = "md",
  className,
  rounded = "md",
}: {
  name: string;
  src?: string | null;
  size?: CrestSize;
  className?: string;
  rounded?: "full" | "md" | "card";
}) {
  return (
    <Crest
      name={name}
      src={src}
      size={size}
      shape={rounded === "full" ? "round" : "square"}
      className={className}
    />
  );
}
