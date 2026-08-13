import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getActor } from "@/lib/session";

/** Marketing surface. It is allowed larger type than the app, but it earns it
 *  with one statement — not a wall of feature cards. */
export default async function LandingPage() {
  const actor = await getActor();

  return (
    <div className="min-h-dvh">
      <header className="border-line border-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-5">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {actor ? (
              <Button asChild variant="primary" size="sm">
                <Link href="/home">Open the archive</Link>
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

      <main id="main" className="mx-auto max-w-5xl px-5">
        <section className="py-20 sm:py-28">
          <p className="label mb-5">The permanent record of your league</p>
          <h1 className="max-w-3xl text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl">
            Your league has a history. Most of it is already lost.
          </h1>
          <p className="text-muted mt-6 max-w-xl text-md leading-relaxed">
            Every championship, every blowout, every trade nobody has forgiven —
            kept permanently, and handed back to you on the anniversary of the
            day it happened.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild variant="primary" size="lg">
              <Link href={actor ? "/home" : "/register"}>
                {actor ? "Open the archive" : "Start your archive"}
              </Link>
            </Button>
            <Link href="/login" className="text-muted hover:text-ink text-sm">
              I already have an account
            </Link>
          </div>
        </section>

        {/* A specimen of what the product actually produces, rather than
            feature cards describing it. */}
        <section className="border-line border-t py-14">
          <p className="label mb-6">A memory, as the site would show it to you</p>

          <div className="max-w-2xl">
            <p className="text-faint tnum mb-2 text-xs">
              December 26, 2023 · Week 17 · The Founders League
            </p>
            <p className="font-display text-xl leading-tight font-semibold text-balance sm:text-2xl">
              Liam Castellano won the 2023 championship, beating you 140.23–116.14.
            </p>
            <p className="text-muted mt-2 text-md">
              Regulation Gentlemen over Overtime Optimists
            </p>
          </div>

          <p className="text-muted mt-10 max-w-xl text-sm leading-relaxed">
            The same game reads differently depending on who opens it. Your
            opponent sees that they beat you. You see that you lost the final.
          </p>
        </section>

        {/* Framed as one league's archive, not as platform-wide totals — these
            are illustrative figures, and unlabelled numbers on a landing page
            read as a live count. */}
        <section className="border-line border-t py-14">
          <p className="label mb-6">What ten seasons of one league leaves behind</p>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
            {[
              ["Seasons archived", "10"],
              ["Matchups recorded", "832"],
              ["Records tracked", "30"],
              ["Trades never forgiven", "60"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="label mb-1">{label}</dt>
                <dd className="figure-num tnum text-2xl">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-line border-t py-20 sm:py-24">
          <h2 className="max-w-2xl text-2xl leading-tight font-semibold text-balance sm:text-3xl">
            Five years from now, this is where it all still lives.
          </h2>
          <Button asChild variant="primary" size="lg" className="mt-7">
            <Link href={actor ? "/home" : "/register"}>
              {actor ? "Open the archive" : "Start your archive"}
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-line text-faint border-t px-5 py-6 text-center text-xs">
        The Museum of Fantasy Sports
      </footer>
    </div>
  );
}
