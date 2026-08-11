"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

export type SegmentedItem = {
  label: string;
  value: string;
  href?: string;
};

/** Underlined tab bar rather than pill buttons. Reads as navigation and stays
 *  legible with a decade of seasons in it. */
export function Tabs({
  items,
  active,
  onSelect,
  className,
}: {
  items: SegmentedItem[];
  active: string;
  onSelect?: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "no-scrollbar border-line flex gap-5 overflow-x-auto border-b",
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === active;
        const classes = cn(
          "relative shrink-0 whitespace-nowrap pb-2.5 text-sm font-medium transition-colors",
          isActive ? "text-ink" : "text-muted hover:text-ink",
        );
        const marker = isActive ? (
          <span className="bg-brand absolute inset-x-0 -bottom-px h-0.5" />
        ) : null;

        return item.href ? (
          <Link
            key={item.value}
            href={item.href}
            role="tab"
            aria-selected={isActive}
            className={classes}
          >
            {item.label}
            {marker}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect?.(item.value)}
            className={classes}
          >
            {item.label}
            {marker}
          </button>
        );
      })}
    </div>
  );
}

/** Compact season/week chooser. Small, monospaced numerals, minimal chrome. */
export function Chips({
  items,
  active,
  className,
}: {
  items: SegmentedItem[];
  active: string;
  className?: string;
}) {
  return (
    <div className={cn("no-scrollbar flex gap-1 overflow-x-auto", className)}>
      {items.map((item) => {
        const isActive = item.value === active;
        return (
          <Link
            key={item.value}
            href={item.href ?? "#"}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "tnum inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
              isActive
                ? "bg-surface-3 text-ink"
                : "text-muted hover:bg-surface-2 hover:text-ink",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
