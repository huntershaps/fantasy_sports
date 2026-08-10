import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="bg-surface-2 text-subtle mx-auto mb-6 grid size-14 place-items-center rounded-2xl">
          <SearchX className="size-6" />
        </div>
        <p className="eyebrow mb-2">404 — Not in the archive</p>
        <h1 className="text-3xl font-extrabold">This page never happened</h1>
        <p className="text-muted mt-3 leading-relaxed">
          No season, matchup, or trade lives at this address.
        </p>
        <Button asChild variant="primary" className="mt-7">
          <Link href="/home">Back to your dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
