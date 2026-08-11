"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Plus, Shield } from "lucide-react";
import { BrandMark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Crest } from "@/components/ui/crest";
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
  const main = sections[0];
  const admin = sections.find((s) => s.label === "Admin");
  const inAdmin = pathname.startsWith("/admin");

  return (
    <aside className="border-line bg-surface fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r lg:flex">
      <div className="flex h-20 shrink-0 items-center px-5">
        <Link href="/home" aria-label="Home" className="rounded-md">
          <BrandMark className="size-11" />
        </Link>
      </div>

      <nav aria-label="Main" className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {main.items.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActivePath(pathname, item)} />
            </li>
          ))}
        </ul>

        <div className="mt-7">
          <p className="label px-3 pb-2">My Leagues</p>
          <ul className="space-y-0.5">
            {leagues.map((league) => {
              const href = `/league/${league.slug}`;
              const active = pathname.startsWith(href);
              return (
                <li key={league.slug}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-surface-2 text-ink font-medium"
                        : "text-muted hover:bg-surface-2/70 hover:text-ink",
                    )}
                  >
                    <span
                      aria-hidden
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: league.accentColor }}
                    />
                    <span className="min-w-0 flex-1 truncate">{league.name}</span>
                    {league.record ? (
                      <span className="tnum text-faint shrink-0 text-xs">
                        {league.record}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
            <li>
              <Link
                href="/leagues"
                className="text-faint hover:text-ink flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
              >
                <Plus className="size-3.5 shrink-0" />
                Add League
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Admin collapses to a single entry until you are actually in it, then
          expands — otherwise its sub-pages are two clicks deep and invisible. */}
      {admin ? (
        <div className="px-3 pb-2">
          {inAdmin ? (
            <>
              <p className="label px-3 pt-2 pb-2">Admin</p>
              <ul className="space-y-0.5">
                {admin.items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={isActivePath(pathname, item)} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Link
              href="/admin"
              className="text-muted hover:bg-surface-2/70 hover:text-ink flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors"
            >
              <Shield className="text-faint size-4 shrink-0" />
              Admin
            </Link>
          )}
        </div>
      ) : null}

      <div className="border-line flex items-center gap-2 border-t px-3 py-2.5">
        <Link
          href="/profile"
          className="hover:bg-surface-2 flex min-w-0 flex-1 items-center gap-2.5 rounded-md p-1 transition-colors"
        >
          <Crest name={user.name} src={user.image} size="md" shape="round" />
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
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-surface-2 text-ink font-medium"
          : "text-muted hover:bg-surface-2/70 hover:text-ink",
      )}
    >
      {active ? (
        <span className="bg-brand absolute inset-y-1.5 -left-3 w-0.5 rounded-r-full" />
      ) : null}
      <item.icon className={cn("size-4 shrink-0", active ? "text-brand" : "text-faint")} />
      {item.label}
    </Link>
  );
}
