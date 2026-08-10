import { cn } from "@/lib/utils";

/** Museum mark: a trophy silhouette framed by a pediment — "hall of fame",
 *  not "fantasy football clip art". */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-8", className)}
    >
      <rect width="32" height="32" rx="9" fill="var(--c-gold)" />
      <path
        d="M6 11.5 16 5.5l10 6"
        stroke="var(--c-text-inverse)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M11 14v3.2a5 5 0 0 0 10 0V14z"
        fill="var(--c-text-inverse)"
      />
      <path
        d="M11 15h-1.6a2.4 2.4 0 0 0 2.4 2.4M21 15h1.6a2.4 2.4 0 0 1-2.4 2.4"
        stroke="var(--c-text-inverse)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M16 22.2v2.3M12.8 26h6.4"
        stroke="var(--c-text-inverse)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
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
    <span className={cn("flex items-center gap-2.5", className)}>
      <BrandMark />
      {!compact && (
        <span className="font-display leading-none">
          <span className="block text-[13px] font-extrabold tracking-[0.18em] uppercase">
            The Museum
          </span>
          <span className="text-subtle block text-[10px] font-semibold tracking-[0.16em] uppercase">
            of Fantasy Sports
          </span>
        </span>
      )}
    </span>
  );
}
