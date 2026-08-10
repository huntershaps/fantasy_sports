import { Sidebar } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Topbar } from "@/components/shell/topbar";
import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { requireViewContext } from "@/lib/session";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { actor, viewer, isImpersonating } = await requireViewContext();

  return (
    <div className="min-h-dvh lg:pl-[248px]">
      <Sidebar user={actor} />

      <div className="flex min-h-dvh flex-col">
        {isImpersonating ? <ImpersonationBanner viewer={viewer} /> : null}
        <Topbar user={actor} />

        <main
          id="main"
          className="flex-1 pb-24 lg:pb-12"
          style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
      </div>

      <MobileNav user={actor} />
    </div>
  );
}

/** Consistent page gutters. Every route body should sit inside one of these. */
export function PageContainer({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1400px] px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}
