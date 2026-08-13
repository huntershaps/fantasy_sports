"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  requestPasswordReset,
  type ResetRequestState,
} from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordReset, {} as ResetRequestState);

  if (state.sent) {
    return (
      <div className="space-y-5">
        <div className="bg-win/15 text-win grid size-12 place-items-center rounded-2xl">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">
            {state.mailConfigured ? "Check your email" : "Request received"}
          </h1>
          <p className="text-muted mt-2 text-sm leading-relaxed">
            {state.mailConfigured
              ? "If an account exists for that address, a reset link is on its way."
              : "Email delivery is not set up on this archive yet, so no message will arrive. Ask the commissioner to generate a reset link for you."}
          </p>
        </div>

        {state.devLink ? (
          <div className="border-line bg-surface-2 rounded-xl border p-3">
            <p className="label mb-1.5">Development only</p>
            <p className="text-muted mb-2 text-xs">
              No mail transport is configured, so the link is shown here instead.
            </p>
            <Link
              href={state.devLink}
              className="text-brand text-sm font-medium break-all hover:underline"
            >
              {state.devLink}
            </Link>
          </div>
        ) : null}

        <Button asChild variant="outline" size="lg" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Reset your password</h1>
        <p className="text-muted mt-2 text-sm">
          We will send a link to get you back into the archive.
        </p>
      </div>

      {state.error ? (
        <p className="text-loss text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </Field>

      <SubmitButton />

      <p className="text-muted text-center text-sm">
        <Link href="/login" className="text-brand font-medium hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Sending…" : "Send reset link"}
    </Button>
  );
}
