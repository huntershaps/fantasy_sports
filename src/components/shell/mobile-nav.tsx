"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, MoreHorizontal, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  isActivePath,
  navigationFor,
  primaryMobileItems,
  type NavItem,
} from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

export function MobileNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const primary = primaryMobileItems(user.role);
  const sections = navigationFor(user.role);

  // Route changes should never leave the sheet stranded open.
  useEffect(() => setSheetOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  return (
    <>
      <nav
        aria-label="Main"
        className="border-line bg-bg/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
          {primary.map((item) => (
            <li key={item.href}>
              <NavTab item={item} active={isActivePath(pathname, item)} />
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-expanded={sheetOpen}
              className="text-subtle active:text-ink flex h-full w-full flex-col items-center gap-1 py-2.5"
            >
              <MoreHorizontal className="size-[22px]" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </li>
        </ul>
      </nav>

      <AnimatePresence>
        {sheetOpen ? (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setSheetOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="More navigation"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              className="border-line bg-surface absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
            >
              <div className="bg-line-strong mx-auto mt-3 h-1 w-10 rounded-full" />

              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <Link
                  href="/profile"
                  className="flex min-w-0 items-center gap-3"
                >
                  <Avatar name={user.name} src={user.image} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {user.name}
                    </span>
                    <span className="text-subtle block truncate text-xs">
                      View profile
                    </span>
                  </span>
                </Link>
                <div className="flex items-center gap-1">
                  <ThemeToggle />
                  <button
                    type="button"
                    onClick={() => setSheetOpen(false)}
                    aria-label="Close menu"
                    className="text-subtle hover:text-ink grid size-8 place-items-center rounded-lg"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-5 px-4 pt-3 pb-6">
                {sections.map((section, i) => (
                  <div key={section.label ?? i}>
                    {section.label ? (
                      <p className="eyebrow px-2 pb-2">{section.label}</p>
                    ) : null}
                    <ul className="grid grid-cols-2 gap-2">
                      {section.items.map((item) => {
                        const active = isActivePath(pathname, item);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex items-center gap-2.5 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                                active
                                  ? "border-gold/40 bg-gold-wash text-ink"
                                  : "border-line bg-surface-2 text-muted active:bg-surface-3",
                              )}
                            >
                              <item.icon
                                className={cn(
                                  "size-4 shrink-0",
                                  active ? "text-gold" : "text-subtle",
                                )}
                              />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <Link
                  href="/signout"
                  className="border-line text-muted active:bg-surface-2 flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium"
                >
                  <LogOut className="size-4" />
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

function NavTab({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-full w-full flex-col items-center gap-1 py-2.5 transition-colors",
        active ? "text-gold" : "text-subtle active:text-ink",
      )}
    >
      {active ? (
        <motion.span
          layoutId="mobile-nav-indicator"
          className="bg-gold absolute top-0 h-0.5 w-8 rounded-full"
        />
      ) : null}
      <item.icon className="size-[22px]" />
      <span className="text-[10px] font-semibold">{item.label}</span>
    </Link>
  );
}
