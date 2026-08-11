"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { completePasswordReset, type ResetState } from "@/app/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, formAction] = useActionState(completePasswordReset, {} as ResetState);

  if (state.done) {
    return (
      <div className="space-y-5">
        <div className="bg-win/15 text-win grid size-12 place-items-center rounded-2xl">
          <CheckCircle2 className="size-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Password updated</h1>
          <p className="text-muted mt-2 text-sm">You can sign in with it now.</p>
        </div>
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-5">
        <h1 className="text-xl font-semibold">Link missing</h1>
        <p className="text-muted text-sm">
          This page needs a reset link from your email.
        </p>
        <Button asChild variant="primary" size="lg" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Choose a new password</h1>
      </div>

      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div
          role="alert"
          className="border-loss/30 bg-loss/15 text-loss flex items-start gap-2.5 rounded-xl border p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <Field
        label="New password"
        htmlFor="password"
        hint="At least 10 characters."
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Updating…" : "Update password"}
    </Button>
  );
}
