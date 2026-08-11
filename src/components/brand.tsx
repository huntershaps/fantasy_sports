import { cn } from "@/lib/utils";

/** A museum plaque: engraved rule, monogram, engraved rule. Reads as an
 *  institution rather than a football app, which is the whole premise. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden className={cn("size-6", className)}>
      <rect
        x="0.75"
        y="0.75"
        width="26.5"
        height="26.5"
        rx="3.25"
        stroke="var(--c-brand)"
        strokeWidth="1.5"
      />
      <path d="M7 8.5h14" stroke="var(--c-brand)" strokeWidth="1.5" strokeLinecap="square" />
      <path d="M7 19.5h14" stroke="var(--c-brand)" strokeWidth="1.5" strokeLinecap="square" />
      <text
        x="14"
        y="17"
        textAnchor="middle"
        fill="var(--c-brand)"
        fontFamily="var(--font-archivo), sans-serif"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        MFS
      </text>
    </svg>
  );
}

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BrandMark />
      {!compact && (
        <span className="font-display leading-none">
          <span className="text-ink block text-xs font-semibold tracking-[0.13em] uppercase">
            The Museum
          </span>
          <span className="text-faint mt-0.5 block text-[9px] font-medium tracking-[0.13em] uppercase">
            of Fantasy Sports
          </span>
        </span>
      )}
    </span>
  );
}
