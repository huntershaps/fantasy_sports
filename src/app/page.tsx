import Link from "next/link";
import { ArrowRight, Flame, Repeat, Sparkles, Trophy } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { getActor } from "@/lib/session";

export default async function LandingPage() {
  const actor = await getActor();

  return (
    <div className="min-h-dvh">
      <header className="border-line/60 sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {actor ? (
              <Button asChild variant="primary" size="sm">
                <Link href="/home">Open the museum</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild variant="primary" size="sm">
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden">
          <div className="field-lines pointer-events-none absolute inset-0 opacity-50" />
          <div className="from-gold/10 pointer-events-none absolute inset-0 bg-gradient-to-b via-transparent to-transparent" />

          <div className="relative mx-auto max-w-6xl px-5 pt-20 pb-16 sm:pt-28 sm:pb-24">
            <Badge tone="gold" size="md" className="mb-6">
              <Trophy /> A permanent archive of your league
            </Badge>

            <h1 className="max-w-4xl text-5xl leading-[0.92] font-extrabold text-balance sm:text-7xl lg:text-8xl">
              Your league has a history.
            </h1>

            <p className="text-muted mt-7 max-w-2xl text-lg leading-relaxed text-pretty sm:text-xl">
              Every championship. Every heartbreak. Every ridiculous trade.
              Every record-breaking Sunday. Kept forever, and served back to
              you on the anniversary of the day it happened.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button asChild variant="primary" size="lg">
                <Link href={actor ? "/home" : "/register"}>
                  {actor ? "Open the museum" : "Start your archive"}
                  <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-20 sm:pb-28">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ShowcaseCard
              icon={Trophy}
              tone="gold"
              eyebrow="Award"
              title="League Champion"
              body="Collectible award cards and real, downloadable certificates for every title, every blowout, every embarrassment."
              figure="2025"
            />
            <ShowcaseCard
              icon={Sparkles}
              tone="violet"
              eyebrow="Memory · 3 years ago today"
              title="You beat Noah 164.2–63.7"
              body="Memories know who is reading them. The same game reads differently depending on which side of it you were on."
              figure="164.2"
            />
            <ShowcaseCard
              icon={Flame}
              tone="ember"
              eyebrow="League record"
              title="Highest score, all time"
              body="Records track their own lineage, so the site can tell you the exact Sunday an old record finally fell."
              figure="182.64"
            />
            <ShowcaseCard
              icon={Repeat}
              tone="ice"
              eyebrow="Trade · Aug 14, 2024"
              title="The one nobody lets him forget"
              body="Trades, waiver claims, drops, and draft picks — the full paper trail of every decision, good and catastrophic."
              figure="—"
            />
            <Card
              variant="raised"
              className="from-gold/15 flex flex-col justify-between overflow-hidden bg-gradient-to-br to-transparent p-6 sm:col-span-2"
            >
              <div>
                <p className="eyebrow mb-3">Did you know?</p>
                <p className="text-2xl leading-snug font-bold text-balance sm:text-3xl">
                  Your league has played 1,482 matchups. The site surfaces the
                  interesting ones before you go looking.
                </p>
              </div>
              <p className="text-muted mt-6 leading-relaxed">
                The point is not a dashboard. The point is opening it on a
                Tuesday and saying: I completely forgot that happened.
              </p>
            </Card>
          </div>
        </section>

        <section className="border-line border-t">
          <div className="mx-auto max-w-6xl px-5 py-20 text-center sm:py-28">
            <h2 className="text-4xl font-extrabold text-balance sm:text-5xl">
              Five years from now, this is where it all still lives.
            </h2>
            <Button asChild variant="primary" size="lg" className="mt-8">
              <Link href={actor ? "/home" : "/register"}>
                {actor ? "Open the museum" : "Start your archive"}
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-line text-subtle border-t px-5 py-8 text-center text-sm">
        The Museum of Fantasy Sports
      </footer>
    </div>
  );
}

const tones = {
  gold: { wash: "bg-gold-wash", text: "text-gold" },
  violet: { wash: "bg-violet-wash", text: "text-violet" },
  ember: { wash: "bg-ember-wash", text: "text-ember" },
  ice: { wash: "bg-ice-wash", text: "text-ice" },
} as const;

function ShowcaseCard({
  icon: Icon,
  tone,
  eyebrow,
  title,
  body,
  figure,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof tones;
  eyebrow: string;
  title: string;
  body: string;
  figure: string;
}) {
  const t = tones[tone];
  return (
    <Card variant="raised" className="flex flex-col p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className={`grid size-10 place-items-center rounded-xl ${t.wash}`}>
          <Icon className={`size-5 ${t.text}`} />
        </div>
        <span className={`stat-figure text-2xl ${t.text}`}>{figure}</span>
      </div>
      <p className="eyebrow mb-2">{eyebrow}</p>
      <h3 className="text-lg font-bold text-balance">{title}</h3>
      <p className="text-muted mt-2.5 text-sm leading-relaxed">{body}</p>
    </Card>
  );
}
