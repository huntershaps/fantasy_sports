import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="bg-ember-wash text-ember mx-auto mb-6 grid size-14 place-items-center rounded-2xl">
          <ShieldOff className="size-6" />
        </div>
        <p className="eyebrow mb-2">403 — Restricted</p>
        <h1 className="text-3xl font-extrabold">Members only</h1>
        <p className="text-muted mt-3 leading-relaxed">
          This part of the archive belongs to a league you are not in. If that
          seems wrong, ask your commissioner to add you.
        </p>
        <Button asChild variant="primary" className="mt-7">
          <Link href="/home">Back to your dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
