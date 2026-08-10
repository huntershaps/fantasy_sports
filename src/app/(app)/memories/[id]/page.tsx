import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { requireViewContext } from "@/lib/session";
import { getMemory } from "@/lib/queries/memories";

export const metadata: Metadata = { title: "Memory" };

const dateFormat = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export default async function MemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { actor, viewer } = await requireViewContext();

  const memory = await getMemory(actor, id, viewer.id);
  if (!memory) notFound();

  const yearsAgo =
    new Date().getUTCFullYear() - memory.occurredOn.getUTCFullYear();

  return (
    <PageContainer className="max-w-3xl py-8 sm:py-10">
      <Link
        href="/memories"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="size-4" />
        All memories
      </Link>

      <Card variant="raised" className="overflow-hidden">
        <div className="border-line flex flex-wrap items-center gap-2 border-b px-6 py-4">
          <Badge tone="gold" size="xs">
            {memory.type.replace(/_/g, " ")}
          </Badge>
          <span className="text-subtle text-xs">
            {dateFormat.format(memory.occurredOn)}
          </span>
          {yearsAgo > 0 ? (
            <span className="text-subtle text-xs">
              · {yearsAgo} year{yearsAgo === 1 ? "" : "s"} ago
            </span>
          ) : null}
          <Link
            href={`/league/${memory.card.leagueSlug}`}
            className="text-gold ml-auto text-xs font-semibold hover:underline"
          >
            {memory.card.leagueName}
          </Link>
        </div>

        <div className="p-6 sm:p-8">
          <p className="text-2xl leading-snug font-extrabold text-balance sm:text-3xl">
            {memory.card.rendered.text}
          </p>
          {memory.card.rendered.detail ? (
            <p className="text-muted mt-3 text-lg">{memory.card.rendered.detail}</p>
          ) : null}
          {memory.body ? (
            <p className="text-muted mt-5 leading-relaxed">{memory.body}</p>
          ) : null}
        </div>

        {memory.subjects.length > 0 ? (
          <div className="border-line border-t px-6 py-5">
            <p className="eyebrow mb-3">Who was involved</p>
            <ul className="flex flex-wrap gap-3">
              {memory.subjects
                .filter((subject) => subject.user)
                .map((subject) => (
                  <li key={subject.id}>
                    <Link
                      href={`/profile/${subject.user!.id}`}
                      className="border-line bg-surface-2 hover:border-line-strong flex items-center gap-2.5 rounded-xl border py-2 pr-3.5 pl-2 transition-colors"
                    >
                      <Avatar
                        name={subject.user!.name}
                        src={subject.user!.image}
                        size="sm"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {subject.user!.id === viewer.id ? "You" : subject.user!.name}
                        </span>
                        {subject.team ? (
                          <span className="text-subtle block truncate text-xs">
                            {subject.team.name}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ) : null}

        {memory.matchup || memory.record ? (
          <div className="border-line flex flex-wrap gap-3 border-t px-6 py-5">
            {memory.matchup ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/matchup/${memory.matchup.id}`}>
                  See the box score <ArrowRight />
                </Link>
              </Button>
            ) : null}
            {memory.record ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/records">
                  {memory.record.label}: {memory.record.displayValue}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </Card>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
