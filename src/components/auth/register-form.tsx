"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { registerAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const initial: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Claim your history</h1>
        <p className="text-muted mt-2 text-sm">
          Create an account, then a commissioner links you to the teams you
          managed.
        </p>
      </div>

      {state.error ? (
        <div
          role="alert"
          className="border-loss/30 bg-loss/15 text-loss flex items-start gap-2.5 rounded-xl border p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Hunter Shapiro"
          aria-invalid={Boolean(state.fieldErrors?.name)}
        />
      </Field>

      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
      </Field>

      <Field
        label="Password"
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
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirm"
        error={state.fieldErrors?.confirm}
      >
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.confirm)}
        />
      </Field>

      <SubmitButton />

      <p className="text-muted text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-brand font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="primary"
      size="lg"
      className="w-full"
      disabled={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}
