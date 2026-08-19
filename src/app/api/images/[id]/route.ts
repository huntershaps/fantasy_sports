import { db } from "@/lib/db";

/**
 * Serves an uploaded image out of Postgres.
 *
 * Deliberately unauthenticated. These are team crests and profile pictures —
 * the same images the public league page renders to signed-out visitors — and
 * the id is a cuid nobody can enumerate. Gating them would break the public
 * page while protecting nothing that is not already on it.
 *
 * An ImageAsset row is never mutated, so a given id always returns the same
 * bytes and can be cached forever. Replacing a logo writes a new row and points
 * the owning record at it.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const asset = await db.imageAsset.findUnique({
    where: { id },
    select: { bytes: true, mimeType: true, byteSize: true, checksum: true },
  });

  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(asset.bytes), {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.byteSize),
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${asset.checksum}"`,
      // An uploaded SVG can carry script, and it is served from this app's own
      // origin, so it would run with the app's privileges if a browser ever
      // rendered it as a document. These three headers are what make accepting
      // SVG uploads safe: no subresources may load, the type may not be
      // sniffed into something executable, and it renders inline as an image
      // rather than navigating.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
    },
  });
}
