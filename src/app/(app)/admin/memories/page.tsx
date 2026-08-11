import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { setMemoryFeatured, setMemoryHidden } from "@/app/actions/admin";

export const metadata: Metadata = { title: "Manage Memories" };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function AdminMemoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireRole("ADMIN");
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const pageSize = 50;

  const [memories, total] = await Promise.all([
    db.memory.findMany({
      orderBy: [{ importance: "desc" }, { occurredOn: "desc" }],
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { league: { select: { name: true } } },
    }),
    db.memory.count(),
  ]);

  return (
    <AdminShell
      title="Memories"
      description={`${total.toLocaleString()} memories. Auto-generated ones are replaced on rebuild; manual ones are permanent.`}
      wide
    >
      <div className="space-y-2">
        {memories.map((memory) => (
          <Card key={memory.id} variant="bordered" className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge size="xs">{memory.type.replace(/_/g, " ")}</Badge>
                  <Badge size="xs" tone={memory.source === "MANUAL" ? "brand" : "neutral"}>
                    {memory.source}
                  </Badge>
                  <span className="text-faint text-xs">
                    {dateFormat.format(memory.occurredOn)} · {memory.league.name} ·
                    importance {memory.importance}
                  </span>
                  {memory.isHidden ? (
                    <Badge tone="loss" size="xs">
                      Hidden
                    </Badge>
                  ) : null}
                  {memory.isFeatured ? (
                    <Badge tone="brand" size="xs">
                      Featured
                    </Badge>
                  ) : null}
                </div>
                <Link
                  href={`/memories/${memory.id}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {memory.headline}
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <form action={setMemoryFeatured}>
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <input
                    type="hidden"
                    name="featured"
                    value={memory.isFeatured ? "false" : "true"}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {memory.isFeatured ? "Unfeature" : "Feature"}
                  </Button>
                </form>
                <form action={setMemoryHidden}>
                  <input type="hidden" name="memoryId" value={memory.id} />
                  <input
                    type="hidden"
                    name="hidden"
                    value={memory.isHidden ? "false" : "true"}
                  />
                  <Button type="submit" variant="ghost" size="sm">
                    {memory.isHidden ? "Show" : "Hide"}
                  </Button>
                </form>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <nav aria-label="Pagination" className="mt-6 flex items-center justify-between">
        {page > 1 ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/memories?page=${page - 1}`}>Previous</Link>
          </Button>
        ) : (
          <span />
        )}
        <span className="text-faint text-sm">
          Page {page} of {Math.ceil(total / pageSize)}
        </span>
        {page * pageSize < total ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/memories?page=${page + 1}`}>Next</Link>
          </Button>
        ) : (
          <span />
        )}
      </nav>
    </AdminShell>
  );
}

export const dynamic = "force-dynamic";
