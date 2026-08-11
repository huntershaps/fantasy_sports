import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/shell/app-shell";
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

  const yearsAgo = new Date().getUTCFullYear() - memory.occurredOn.getUTCFullYear();

  return (
    <PageContainer width="narrow" className="py-6">
      <Link
        href="/memories"
        className="text-muted hover:text-ink mb-6 inline-flex items-center gap-1.5 text-xs"
      >
        <ArrowLeft className="size-3.5" />
        The archive
      </Link>

      {/* Editorial treatment: standfirst, dateline, then the story. */}
      <article>
        <p className="label mb-3">{memory.type.replace(/_/g, " ")}</p>

        <h1 className="font-display text-2xl leading-tight font-semibold text-balance sm:text-3xl">
          {memory.card.rendered.text}
        </h1>

        {memory.card.rendered.detail ? (
          <p className="text-muted mt-3 text-md">{memory.card.rendered.detail}</p>
        ) : null}

        <p className="text-faint border-line mt-5 border-y py-2.5 text-xs">
          <time dateTime={memory.occurredOn.toISOString()}>
            {dateFormat.format(memory.occurredOn)}
          </time>
          {yearsAgo > 0 ? ` · ${yearsAgo} year${yearsAgo === 1 ? "" : "s"} ago` : null}
          {" · "}
          <Link
            href={`/league/${memory.card.leagueSlug}`}
            className="hover:text-ink underline-offset-2 hover:underline"
          >
            {memory.card.leagueName}
          </Link>
        </p>

        {memory.body ? (
          <p className="text-ink mt-5 text-md leading-relaxed">{memory.body}</p>
        ) : null}

        {memory.subjects.length > 0 ? (
          <section className="mt-8">
            <p className="label mb-2.5">Who was involved</p>
            <ul className="border-line divide-line divide-y border-t">
              {memory.subjects
                .filter((subject) => subject.user)
                .map((subject) => (
                  <li key={subject.id}>
                    <Link
                      href={`/profile/${subject.user!.id}`}
                      className="hover:bg-surface -mx-3 flex items-center gap-3 px-3 py-2.5 transition-colors"
                    >
                      <Avatar
                        name={subject.user!.name}
                        src={subject.user!.image}
                        size="sm"
                        rounded="full"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">
                          {subject.user!.id === viewer.id ? "You" : subject.user!.name}
                        </span>
                        {subject.team ? (
                          <span className="text-faint block truncate text-xs">
                            {subject.team.name}
                          </span>
                        ) : null}
                      </span>
                      <span className="label shrink-0">{subject.role}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        {memory.matchup || memory.record ? (
          <nav className="border-line mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t pt-4 text-sm">
            {memory.matchup ? (
              <Link
                href={`/matchup/${memory.matchup.id}`}
                className="text-brand underline-offset-2 hover:underline"
              >
                See the box score →
              </Link>
            ) : null}
            {memory.record ? (
              <Link href="/records" className="text-brand underline-offset-2 hover:underline">
                {memory.record.label}: {memory.record.displayValue} →
              </Link>
            ) : null}
          </nav>
        ) : null}
      </article>
    </PageContainer>
  );
}

export const dynamic = "force-dynamic";
