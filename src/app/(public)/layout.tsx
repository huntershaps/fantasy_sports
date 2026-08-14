import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

/**
 * Chrome for signed-out visitors.
 *
 * Deliberately not the AppShell: that renders a sidebar of *your* leagues, a
 * profile menu and admin links, all of which assume a signed-in user. A public
 * archive is somebody else's league seen from outside, so it gets its own
 * minimal frame and an honest invitation to sign in.
 */
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-line bg-surface/80 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            <Link href="/" className="rounded-lg">
              <Wordmark />
            </Link>
            <Link href="/l" className="text-muted hover:text-ink hidden text-sm sm:block">
              Browse archives
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="primary" size="sm">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {children}
      </main>

      <footer className="border-line mt-16 border-t">
        <div className="text-muted mx-auto flex w-full max-w-[1180px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm sm:px-6">
          <p>A public archive on The Museum of Fantasy Sports.</p>
          <Link href="/" className="hover:text-ink">
            What is this?
          </Link>
        </div>
      </footer>
    </div>
  );
}
