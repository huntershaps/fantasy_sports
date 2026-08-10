"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentedItem = {
  label: string;
  value: string;
  href?: string;
  count?: number;
};

/** Horizontal pill switcher used for season navigation and feed filters.
 *  Scrolls as a rail on mobile so 8 seasons never wrap into a wall of chips. */
export function Segmented({
  items,
  active,
  onSelect,
  className,
  size = "md",
}: {
  items: SegmentedItem[];
  active: string;
  onSelect?: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm";

  return (
    <div
      role="tablist"
      className={cn(
        "no-scrollbar border-line bg-surface-2 flex gap-1 overflow-x-auto rounded-xl border p-1",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === active;
        const classes = cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors",
          pad,
          isActive
            ? "bg-gold text-inverse"
            : "text-muted hover:bg-surface-3 hover:text-ink",
        );

        if (item.href) {
          return (
            <Link
              key={item.value}
              href={item.href}
              role="tab"
              aria-selected={isActive}
              className={classes}
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="opacity-60">{item.count}</span>
              ) : null}
            </Link>
          );
        }

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect?.(item.value)}
            className={classes}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="opacity-60">{item.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
