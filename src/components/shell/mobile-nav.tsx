"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { isActivePath, navigationFor, primaryMobileItems, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";
import type { SidebarLeague } from "@/components/shell/sidebar";

export function MobileNav({
  user,
  leagues,
}: {
  user: SessionUser;
  leagues: SidebarLeague[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = primaryMobileItems(user.role);
  const sections = navigationFor(user.role);

  // Navigating closes the sheet. Adjusting during render rather than in an
  // effect means the sheet never paints once in the open state on the new page
  // before closing itself.
  const [routeWhenOpened, setRouteWhenOpened] = useState(pathname);
  if (routeWhenOpened !== pathname) {
    setRouteWhenOpened(pathname);
    setOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Main"
        className="border-line bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => (
            <li key={item.href}>
              <Tab item={item} active={isActivePath(pathname, item)} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="text-faint active:text-ink flex h-full w-full flex-col items-center gap-1 pt-2 pb-1.5"
            >
              <MoreHorizontal className="size-[18px]" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 34, stiffness: 380 }}
              className="border-line bg-surface absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-xl border-t"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="border-line sticky top-0 flex items-center justify-between border-b bg-surface px-4 py-3">
                <Link href="/profile" className="min-w-0">
                  <span className="block truncate text-sm font-medium">{user.name}</span>
                  <span className="text-faint block text-xs">View profile</span>
                </Link>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Close menu"
                    className="text-faint hover:text-ink grid size-7 place-items-center rounded-md"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="px-4 py-3">
                {leagues.length > 0 ? (
                  <div className="mb-4">
                    <p className="label mb-1.5">Leagues</p>
                    <ul className="divide-line divide-y">
                      {leagues.map((league) => (
                        <li key={league.slug}>
                          <Link
                            href={`/league/${league.slug}`}
                            className="flex items-center gap-2.5 py-2.5"
                          >
                            <span
                              aria-hidden
                              className="h-5 w-0.5 shrink-0 rounded-full"
                              style={{ backgroundColor: league.accentColor }}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {league.name}
                              </span>
                              {league.teamName ? (
                                <span className="text-faint block truncate text-xs">
                                  {league.teamName}
                                </span>
                              ) : null}
                            </span>
                            {league.record ? (
                              <span className="tnum text-faint text-xs">{league.record}</span>
                            ) : null}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {sections.map((section, i) => (
                  <div key={section.label ?? i} className="mb-4">
                    <p className="label mb-1.5">{section.label ?? "Browse"}</p>
                    <ul className="divide-line divide-y">
                      {section.items.map((item) => {
                        const active = isActivePath(pathname, item);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-3 py-2.5 text-sm",
                                active ? "text-ink font-medium" : "text-muted",
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "size-4 shrink-0",
                                  active ? "text-brand" : "text-faint",
                                )}
                              />
                              {item.label}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <Link
                  href="/signout"
                  className="border-line text-muted flex items-center justify-center gap-2 rounded-md border py-2.5 text-sm"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </Link>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Tab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full w-full flex-col items-center gap-1 pt-2 pb-1.5 transition-colors",
        active ? "text-ink" : "text-faint active:text-muted",
      )}
    >
      {active ? <span className="bg-brand absolute inset-x-4 top-0 h-0.5 rounded-full" /> : null}
      <item.icon className={cn("size-[18px]", active && "text-brand")} />
      <span className="text-[10px] font-medium">{item.label}</span>
    </Link>
  );
}
