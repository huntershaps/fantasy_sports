"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/session";

export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="border-line bg-bg/80 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur-xl sm:px-6">
      <Link href="/home" className="rounded-lg lg:hidden">
        <Wordmark compact />
      </Link>

      <Link
        href="/search"
        className="border-line bg-surface-2 text-subtle hover:border-line-strong hover:text-muted ml-auto hidden h-9 w-72 items-center gap-2.5 rounded-xl border px-3 text-sm transition-colors lg:flex"
      >
        <Search className="size-4" />
        Search players, managers, matchups…
      </Link>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <Link
          href="/search"
          aria-label="Search"
          className="text-subtle hover:text-ink grid size-8 place-items-center rounded-lg transition-colors lg:hidden"
        >
          <Search className="size-[18px]" />
        </Link>
        <ThemeToggle className="hidden lg:inline-flex" />
        <Link href="/profile" aria-label="Your profile" className="lg:hidden">
          <Avatar name={user.name} src={user.image} size="sm" />
        </Link>
      </div>
    </header>
  );
}
