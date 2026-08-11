import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="bg-brand-dim/25 text-brand mx-auto mb-6 grid size-14 place-items-center rounded-2xl">
          <LockKeyhole className="size-6" />
        </div>
        <p className="label mb-2">401 — Sign in required</p>
        <h1 className="text-xl font-semibold">Your history is behind the door</h1>
        <p className="text-muted mt-3 leading-relaxed">
          Sign in to see your teams, awards, and everything your league would
          rather forget.
        </p>
        <Button asChild variant="primary" className="mt-7">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}
