"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { loginAction, type AuthFormState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

const initial: AuthFormState = {};

export function LoginForm() {
  const params = useSearchParams();
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold">Welcome back</h1>
        <p className="text-muted mt-2 text-sm">
          Sign in to see your teams, your trophies, and your regrets.
        </p>
      </div>

      <input type="hidden" name="next" value={params.get("next") ?? "/home"} />

      {state.error ? (
        <div
          role="alert"
          className="border-loss/30 bg-loss/15 text-loss flex items-start gap-2.5 rounded-xl border p-3 text-sm"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

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
        error={state.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
      </Field>

      <SubmitButton />

      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted hover:text-ink">
          Forgot password?
        </Link>
        <Link href="/register" className="text-brand font-medium hover:underline">
          Create account
        </Link>
      </div>
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
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}
