"use client";

import { useState } from "react";
import { resolveImageSrc } from "@/lib/images";
import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
  "2xl": 80,
  "3xl": 96,
} as const;

export type CrestSize = keyof typeof sizes;

/** Six crest palettes. Assignment is deterministic from the name, so a manager
 *  or team keeps the same colours forever without anything being stored. */
const PALETTES = [
  { from: "#2D8CFF", to: "#1B4E96", ink: "#FFFFFF" },
  { from: "#22C55E", to: "#14663A", ink: "#04240F" },
  { from: "#F59E0B", to: "#8A5A05", ink: "#2B1B00" },
  { from: "#EF4444", to: "#8C1F1F", ink: "#FFFFFF" },
  { from: "#A78BFA", to: "#5B3FA8", ink: "#FFFFFF" },
  { from: "#14B8A6", to: "#0B5F58", ink: "#022B27" },
] as const;

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function paletteFor(name: string) {
  return PALETTES[hash(name) % PALETTES.length];
}

/**
 * A monogram crest. Real jersey-badge geometry — a shield with a chevron and a
 * bar — rather than a coloured circle, so an unclaimed team still looks like it
 * belongs to a sports product.
 *
 * `src` wins when present and loadable, which is how a user-supplied picture
 * overrides the generated fallback. It accepts either an http(s) URL or an
 * `asset:<id>` reference to an image uploaded through the app; resolveImageSrc
 * sorts that out and returns null for anything that cannot render, including
 * the ESPN host that answers 401 to every anonymous request. A dead logo URL is
 * the normal case rather than an edge case, so a failed load also falls back to
 * the monogram instead of leaving an empty frame.
 */
export function Crest({
  name,
  src,
  size = "md",
  shape = "shield",
  className,
  priority,
}: {
  name: string;
  src?: string | null;
  size?: CrestSize;
  shape?: "shield" | "round" | "square";
  className?: string;
  priority?: boolean;
}) {
  const px = sizes[size];
  const palette = paletteFor(name);
  const id = `crest-${hash(name).toString(36)}`;
  const [broken, setBroken] = useState(false);
  const resolved = resolveImageSrc(src);

  if (resolved && !broken) {
    // A plain <img>, deliberately. Profile pictures are user-supplied URLs on
    // arbitrary hosts; routing them through next/image would mean either
    // allow-listing every possible host or letting the optimizer fetch any URL
    // a user pastes. These are small images, so the optimizer buys little.
    return (
      <span
        className={cn(
          "border-line block shrink-0 overflow-hidden border",
          shape === "round" ? "rounded-full" : "rounded-md",
          className,
        )}
        style={{ width: px, height: px }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolved}
          alt=""
          width={px}
          height={px}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      </span>
    );
  }

  if (shape === "round" || shape === "square") {
    return (
      <span
        aria-hidden
        className={cn(
          "grid shrink-0 place-items-center font-semibold",
          shape === "round" ? "rounded-full" : "rounded-md",
          className,
        )}
        style={{
          width: px,
          height: px,
          background: `linear-gradient(150deg, ${palette.from}, ${palette.to})`,
          color: palette.ink,
          fontSize: Math.round(px * 0.36),
          letterSpacing: "0.02em",
        }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 48 52"
      width={px}
      height={Math.round(px * (52 / 48))}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={palette.from} />
          <stop offset="100%" stopColor={palette.to} />
        </linearGradient>
      </defs>
      {/* Shield outline */}
      <path
        d="M24 1.5 46.5 8v18c0 12.6-8.6 20.4-22.5 24.4C10.1 46.4 1.5 38.6 1.5 26V8Z"
        fill={`url(#${id})`}
        stroke="rgb(255 255 255 / 0.22)"
        strokeWidth="1.5"
      />
      {/* Chevron across the lower third */}
      <path
        d="M1.8 31.5 24 38l22.2-6.5v5.2L24 43.2 1.8 36.7Z"
        fill="rgb(0 0 0 / 0.18)"
      />
      <text
        x="24"
        y="26"
        textAnchor="middle"
        fill={palette.ink}
        fontFamily="var(--font-grotesk), sans-serif"
        fontSize="17"
        fontWeight="700"
        letterSpacing="0.01em"
      >
        {initials(name)}
      </text>
    </svg>
  );
}
