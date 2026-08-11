import {
  BarChart3,
  CalendarDays,
  Cog,
  Database,
  History,
  Home,
  Medal,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trophy,
  UserCircle,
  Users,
} from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requires?: UserRole;
  /** Shown in the mobile bottom bar (four, plus More). */
  primary?: boolean;
  exact?: boolean;
};

export type NavSection = { label?: string; items: NavItem[] };

const ROLE_RANK: Record<UserRole, number> = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 };

export function canAccess(role: UserRole, required?: UserRole): boolean {
  if (!required) return true;
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

const MAIN: NavSection = {
  items: [
    { label: "Home", href: "/home", icon: Home, primary: true, exact: true },
    { label: "Leagues", href: "/leagues", icon: Shield, primary: true },
    { label: "Memories", href: "/memories", icon: Sparkles, primary: true },
    { label: "Awards", href: "/awards", icon: Trophy, primary: true },
    { label: "Records", href: "/records", icon: Medal },
    { label: "History", href: "/history", icon: History },
    { label: "My Teams", href: "/teams", icon: Users },
    { label: "Search", href: "/search", icon: Search },
  ],
};

const ACCOUNT: NavSection = {
  label: "Account",
  items: [{ label: "Profile", href: "/profile", icon: UserCircle }],
};

const ADMIN: NavSection = {
  label: "Admin",
  items: [
    { label: "Overview", href: "/admin", icon: BarChart3, requires: "ADMIN", exact: true },
    { label: "Leagues", href: "/admin/leagues", icon: Shield, requires: "ADMIN" },
    { label: "Seasons", href: "/admin/seasons", icon: CalendarDays, requires: "ADMIN" },
    { label: "Users", href: "/admin/users", icon: Users, requires: "SUPER_ADMIN" },
    { label: "Awards", href: "/admin/awards", icon: Trophy, requires: "ADMIN" },
    { label: "Memories", href: "/admin/memories", icon: Sparkles, requires: "ADMIN" },
    { label: "Records", href: "/admin/records", icon: Medal, requires: "ADMIN" },
    { label: "Data", href: "/admin/data", icon: Database, requires: "ADMIN" },
    { label: "Data Sync", href: "/admin/sync", icon: RefreshCw, requires: "ADMIN" },
    { label: "System", href: "/admin/settings", icon: Cog, requires: "SUPER_ADMIN" },
  ],
};

/** Presentation only — every route enforces its own access check server-side. */
export function navigationFor(role: UserRole): NavSection[] {
  return [MAIN, ACCOUNT, ADMIN]
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(role, item.requires)),
    }))
    .filter((section) => section.items.length > 0);
}

export function primaryMobileItems(role: UserRole): NavItem[] {
  return MAIN.items.filter((item) => item.primary && canAccess(role, item.requires));
}

export function isActivePath(pathname: string, item: { href: string; exact?: boolean }): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
