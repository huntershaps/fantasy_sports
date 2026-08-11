import { Sidebar, type SidebarLeague } from "@/components/shell/sidebar";
import { MobileNav } from "@/components/shell/mobile-nav";
import { Topbar } from "@/components/shell/topbar";
import { ImpersonationBanner } from "@/components/shell/impersonation-banner";
import { requireViewContext } from "@/lib/session";
import { getSidebarLeagues } from "@/lib/queries/leagues";
import { cn } from "@/lib/utils";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const { actor, viewer, isImpersonating } = await requireViewContext();
  const leagues: SidebarLeague[] = await getSidebarLeagues(actor, viewer.id);

  return (
    // Must match the sidebar's w-60, or content slides under it.
    <div className="min-h-dvh lg:pl-60">
      <Sidebar user={actor} leagues={leagues} />

      <div className="flex min-h-dvh flex-col">
        {isImpersonating ? <ImpersonationBanner viewer={viewer} /> : null}
        <Topbar user={actor} />

        <main
          id="main"
          className="flex-1"
          style={{ paddingBottom: "calc(4.5rem + env(safe-area-inset-bottom))" }}
        >
          {children}
        </main>
      </div>

      <MobileNav user={actor} leagues={leagues} />
    </div>
  );
}

/** Page gutters. `wide` opts into the full 12-column working area for
 *  data-dense pages; the default keeps prose at a readable measure. */
export function PageContainer({
  children,
  className,
  width = "default",
}: {
  children: React.ReactNode;
  className?: string;
  width?: "default" | "wide" | "narrow";
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        width === "wide" && "max-w-[1600px]",
        width === "default" && "max-w-[1180px]",
        width === "narrow" && "max-w-3xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
