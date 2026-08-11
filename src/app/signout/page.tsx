import Link from "next/link";
import type { Metadata } from "next";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/brand";

export const metadata: Metadata = { title: "Sign out" };

export default function SignOutPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-sm text-center">
        <Wordmark className="mb-8 justify-center" />
        <h1 className="text-xl font-semibold">Sign out?</h1>
        <p className="text-muted mt-2 text-sm">
          The archive will still be here.
        </p>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="mt-7 space-y-3"
        >
          <Button type="submit" variant="primary" size="lg" className="w-full">
            Sign out
          </Button>
        </form>

        <Button asChild variant="ghost" size="lg" className="mt-2 w-full">
          <Link href="/home">Stay signed in</Link>
        </Button>
      </div>
    </div>
  );
}
