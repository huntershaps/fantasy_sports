import { BASE_PATH } from "@/lib/paths";

/**
 * Logos come from two places and both end up in the same `logoUrl` column.
 *
 * A provider logo is an absolute http(s) URL that ESPN or Yahoo handed us. An
 * uploaded logo is stored as `asset:<imageAssetId>` and served by this app from
 * /api/images/<id>. The sentinel is deliberately NOT a ready-made path: the app
 * is mounted under a base path (/fantasy) that has moved before, and a column
 * full of `/fantasy/api/images/...` would all break the day it moves again.
 * Resolving at render time keeps the stored value independent of where the app
 * is mounted.
 */
const ASSET_SCHEME = "asset:";

/** The value to store in a `logoUrl`/`image` column for an uploaded image. */
export function assetRef(imageAssetId: string): string {
  return `${ASSET_SCHEME}${imageAssetId}`;
}

/** The asset id inside a stored reference, or null if it is not one. */
export function assetIdFromRef(value: string | null | undefined): string | null {
  if (!value?.startsWith(ASSET_SCHEME)) return null;
  return value.slice(ASSET_SCHEME.length) || null;
}

/**
 * Hosts that answer a plain image request with 401 no matter who asks.
 *
 * ESPN puts manager-uploaded team logos (`logoType: CUSTOM_UPLOAD`) on
 * mystique-api.fantasy.espn.com, which requires an ESPN OAuth bearer token.
 * Verified against the live API: even a request carrying valid SWID and
 * espn_s2 cookies comes back 401 with `X-Fantasy-Role: NONE`, so a server-side
 * proxy cannot mirror these either. Rendering one only buys a failed request
 * and a flash of empty frame before the fallback crest appears, so we skip
 * straight to the fallback and let the admin logo screen offer an upload.
 *
 * The URL still gets stored, because it is what the provider actually reports
 * and throwing it away would lose the signal that a custom logo exists.
 */
const UNSERVABLE_HOSTS = [/^mystique-api\./i];

export function isUnservableProviderImage(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return UNSERVABLE_HOSTS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return false;
  }
}

/**
 * Turn a stored `logoUrl` into something an <img src> can actually load, or
 * null when there is nothing renderable and the caller should fall back.
 *
 * Only http(s) is let through. A `javascript:` or `data:` URL reaching an
 * <img src> is the reason this checks the scheme rather than trusting it.
 */
export function resolveImageSrc(value: string | null | undefined): string | null {
  if (!value) return null;

  const assetId = assetIdFromRef(value);
  if (assetId) return `${BASE_PATH}/api/images/${assetId}`;

  if (isUnservableProviderImage(value)) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Only http(s) images are accepted from a form. Shared so every entry point
 *  applies the same rule rather than each re-deriving it. */
export function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Raster formats plus SVG. SVG is allowed because most ESPN logo art is SVG and
 * refusing it would mean a manager cannot re-upload the logo they already have.
 * It is safe here only because /api/images serves every asset with
 * `Content-Security-Policy: default-src 'none'`, `X-Content-Type-Options:
 * nosniff` and `Content-Disposition: inline` — an SVG can carry script, and
 * those headers are what stop it running. Do not widen this list without
 * checking the route still sends them.
 */
export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export function isAllowedImageType(value: string): value is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(value);
}

/** 2 MB. A crest renders at 96px at the very largest, so anything approaching
 *  this is already far more image than the app can use. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export const IMAGE_ACCEPT_ATTRIBUTE = ALLOWED_IMAGE_TYPES.join(",");

/**
 * Sniff the real type from the leading bytes rather than trusting the
 * browser-supplied `File.type`, which is attacker-controlled on an upload.
 * Returns null when the bytes are not one of the allowed formats.
 */
export function sniffImageType(bytes: Uint8Array): AllowedImageType | null {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);

  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (startsWith(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return "image/gif";
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  // SVG is text, so there is no magic number — look for a root element near the
  // start, past any XML declaration, BOM or comment.
  const head = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.subarray(0, 1024))
    .trimStart();
  if (/^(﻿)?(<\?xml[\s\S]*?\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(head)) {
    return "image/svg+xml";
  }

  return null;
}

/**
 * The crest to render for a team.
 *
 * The team's own logo wins. When it has none — or when the provider gave a URL
 * nothing can load, which is every ESPN CUSTOM_UPLOAD logo — the franchise
 * crest stands in, so one upload covers every season that manager has played.
 * Falling back to the team's own unservable URL at the end is deliberate: it
 * keeps the value truthful for anything inspecting it, and resolveImageSrc
 * still drops it before it reaches an <img>.
 */
export function teamCrest(team: {
  logoUrl: string | null;
  franchise?: { logoUrl: string | null } | null;
}): string | null {
  if (team.logoUrl && !isUnservableProviderImage(team.logoUrl)) return team.logoUrl;
  return team.franchise?.logoUrl ?? team.logoUrl;
}
