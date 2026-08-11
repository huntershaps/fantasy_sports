"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { Avatar } from "@/components/ui/avatar";
import type { SessionUser } from "@/lib/session";

/** Deliberately thin. On desktop it is a search affordance and nothing else;
 *  navigation lives in the sidebar and the page owns its own title. */
export function Topbar({ user }: { user: SessionUser }) {
  return (
    <header className="border-line bg-base/90 sticky top-0 z-30 flex h-12 items-center gap-3 border-b px-4 backdrop-blur-md sm:px-6">
      <Link href="/home" className="rounded-sm lg:hidden">
        <Wordmark compact />
      </Link>

      <Link
        href="/search"
        className="border-line bg-surface-2 text-faint hover:border-line-strong hover:text-muted ml-auto hidden h-7 w-64 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors lg:flex"
      >
        <Search className="size-3.5" />
        Search the archive
      </Link>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <Link
          href="/search"
          aria-label="Search"
          className="text-faint hover:text-ink grid size-7 place-items-center rounded-md transition-colors lg:hidden"
        >
          <Search className="size-4" />
        </Link>
        <Link href="/profile" aria-label="Your profile" className="lg:hidden">
          <Avatar name={user.name} src={user.image} size="sm" rounded="full" />
        </Link>
      </div>
    </header>
  );
}
