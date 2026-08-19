import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicArchiveStats, formatCount } from "@/lib/queries/stats";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  // Real counts. These sit beside a sign-in form with no framing to mark them
  // as illustrative, so invented figures read as this archive's actual size.
  const stats = await getPublicArchiveStats();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Marketing panel. Hidden on mobile so the form gets the whole screen. */}
      <aside className="bg-surface relative hidden overflow-hidden lg:block">
        <div className=" absolute inset-0 opacity-60" />
        <div className="from-brand/10 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="w-fit rounded-lg">
            <Wordmark />
          </Link>

          <div className="max-w-lg">
            <p className="label mb-4">Est. the year your league started</p>
            <h1 className="text-3xl leading-tight font-semibold text-balance">
              Your league has a history.
            </h1>
            <p className="text-muted mt-6 text-lg leading-relaxed">
              Every championship. Every heartbreak. Every ridiculous trade.
              Every record-breaking Sunday — kept, indexed, and waiting.
            </p>
          </div>

          {stats.seasons > 0 ? (
            <dl className="grid grid-cols-3 gap-6">
              {[
                ["Seasons archived", formatCount(stats.seasons)],
                ["Matchups recorded", formatCount(stats.matchups)],
                ["Trades never forgiven", formatCount(stats.trades)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="label mb-1.5">{label}</dt>
                  <dd className="figure-num text-brand text-3xl">{value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            // Nothing public to count yet. A row of zeros says less than the
            // line the page already opens with, so the panel just ends here.
            <div />
          )}
        </div>
      </aside>

      <main id="main" className="flex flex-col">
        <div className="flex items-center justify-between p-5 lg:justify-end">
          <Link href="/" className="rounded-lg lg:hidden">
            <Wordmark compact />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
