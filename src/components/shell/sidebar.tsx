"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import { isActivePath, navigationFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  const sections = navigationFor(user.role);

  return (
    <aside className="border-line bg-bg-subtle fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r lg:flex">
      <div className="border-line flex h-16 shrink-0 items-center border-b px-5">
        <Link href="/home" className="rounded-lg">
          <Wordmark />
        </Link>
      </div>

      <nav
        aria-label="Main"
        className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5"
      >
        {sections.map((section, i) => (
          <div key={section.label ?? i}>
            {section.label ? (
              <p className="eyebrow px-3 pb-2">{section.label}</p>
            ) : null}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActivePath(pathname, item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-surface-2 text-ink"
                          : "text-muted hover:bg-surface-2/60 hover:text-ink",
                      )}
                    >
                      {active ? (
                        <span className="bg-gold absolute top-1/2 -left-3 h-5 w-1 -translate-y-1/2 rounded-r-full" />
                      ) : null}
                      <item.icon
                        className={cn(
                          "size-[18px] shrink-0 transition-colors",
                          active ? "text-gold" : "text-subtle group-hover:text-muted",
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
      </nav>

      <div className="border-line border-t p-3">
        <div className="hover:bg-surface-2 flex items-center gap-3 rounded-lg p-2 transition-colors">
          <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3">
            <Avatar name={user.name} src={user.image} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">
                {user.name}
              </span>
              <span className="text-subtle block truncate text-xs">
                {user.role === "SUPER_ADMIN"
                  ? "Super Admin"
                  : user.role === "ADMIN"
                    ? "Admin"
                    : "Manager"}
              </span>
            </span>
          </Link>
          <Link
            href="/signout"
            aria-label="Sign out"
            className="text-subtle hover:text-ink grid size-8 shrink-0 place-items-center rounded-lg transition-colors"
          >
            <LogOut className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  );
}
