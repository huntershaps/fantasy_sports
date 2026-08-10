import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* Marketing panel. Hidden on mobile so the form gets the whole screen. */}
      <aside className="bg-bg-subtle relative hidden overflow-hidden lg:block">
        <div className="field-lines absolute inset-0 opacity-60" />
        <div className="from-gold/12 absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <Link href="/" className="w-fit rounded-lg">
            <Wordmark />
          </Link>

          <div className="max-w-lg">
            <p className="eyebrow mb-4">Est. the year your league started</p>
            <h1 className="text-5xl leading-[0.95] font-extrabold text-balance xl:text-6xl">
              Your league has a history.
            </h1>
            <p className="text-muted mt-6 text-lg leading-relaxed">
              Every championship. Every heartbreak. Every ridiculous trade.
              Every record-breaking Sunday — kept, indexed, and waiting.
            </p>
          </div>

          <dl className="grid grid-cols-3 gap-6">
            {[
              ["Seasons archived", "8"],
              ["Matchups recorded", "1,482"],
              ["Trades never forgiven", "37"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow mb-1.5">{label}</dt>
                <dd className="stat-figure text-gold text-3xl">{value}</dd>
              </div>
            ))}
          </dl>
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
