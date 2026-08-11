"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { isActivePath, navigationFor } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/lib/session";

export type SidebarLeague = {
  slug: string;
  name: string;
  accentColor: string;
  teamName: string | null;
  record: string | null;
};

export function Sidebar({
  user,
  leagues,
}: {
  user: SessionUser;
  leagues: SidebarLeague[];
}) {
  const pathname = usePathname();
  const sections = navigationFor(user.role);
  const [main, ...rest] = sections;

  return (
    <aside className="border-line bg-surface fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r lg:flex">
      <div className="border-line flex h-12 shrink-0 items-center border-b px-4">
        <Link href="/home" className="rounded-sm">
          <Wordmark />
        </Link>
      </div>

      <nav aria-label="Main" className="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-px">
          {main.items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActivePath(pathname, item)} />
            </li>
          ))}
        </ul>

        {/* Leagues live in the sidebar so a league is always one hop away. */}
        {leagues.length > 0 ? (
          <div className="mt-5">
            <p className="label px-2.5 pb-1.5">Leagues</p>
            <ul className="space-y-px">
              {leagues.map((league) => {
                const href = `/league/${league.slug}`;
                const active = pathname.startsWith(href);
                return (
                  <li key={league.slug}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-colors",
                        active ? "bg-surface-2 text-ink" : "text-muted hover:bg-surface-2/60 hover:text-ink",
                      )}
                    >
                      <span
                        aria-hidden
                        className="h-4 w-0.5 shrink-0 rounded-full"
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
                        <span className="tnum text-faint shrink-0 text-xs">
                          {league.record}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {rest.map((section, i) => (
          <div key={section.label ?? i} className="mt-5">
            {section.label ? <p className="label px-2.5 pb-1.5">{section.label}</p> : null}
            <ul className="space-y-px">
              {section.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={isActivePath(pathname, item)} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-line flex items-center gap-2 border-t px-2 py-2">
        <Link
          href="/profile"
          className="hover:bg-surface-2 flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="text-faint block truncate text-xs">
              {user.role === "SUPER_ADMIN"
                ? "Super Admin"
                : user.role === "ADMIN"
                  ? "Admin"
                  : "Manager"}
            </span>
          </span>
        </Link>
        <ThemeToggle />
        <Link
          href="/signout"
          aria-label="Sign out"
          className="text-faint hover:text-ink grid size-7 shrink-0 place-items-center rounded-md transition-colors"
        >
          <LogOut className="size-3.5" />
        </Link>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
}: {
  item: { label: string; href: string; icon: React.ComponentType<{ className?: string }> };
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
        active
          ? "bg-surface-2 text-ink font-medium"
          : "text-muted hover:bg-surface-2/60 hover:text-ink",
      )}
    >
      <item.icon
        className={cn("size-4 shrink-0", active ? "text-brand" : "text-faint")}
      />
      {item.label}
    </Link>
  );
}
