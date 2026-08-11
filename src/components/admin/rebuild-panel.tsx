"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { rebuildDerivedData, type RebuildResult } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";

export function RebuildPanel({
  leagues,
}: {
  leagues: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(
    rebuildDerivedData,
    undefined as RebuildResult | undefined,
  );

  return (
    <Card variant="bordered" className="p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="bg-brand-dim/25 grid size-10 shrink-0 place-items-center rounded-xl">
          <RefreshCw className="text-brand size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Rebuild derived data</h2>
          <p className="text-muted mt-1 text-sm leading-relaxed">
            Recomputes records, awards, certificates, and memories from raw game
            data. Anything created or corrected by hand is left untouched, so
            this is safe to run at any time.
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <Select name="leagueId" defaultValue="" className="h-10 w-56" aria-label="League">
          <option value="">All leagues</option>
          {leagues.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </Select>
        <SubmitButton />
      </form>

      {state ? (
        <div
          role="status"
          className={`mt-4 rounded-xl border p-3 text-sm ${
            state.ok
              ? "border-win/30 bg-win/15 text-win"
              : "border-loss/30 bg-loss/15 text-loss"
          }`}
        >
          <p className="flex items-center gap-2 font-semibold">
            {state.ok ? (
              <CheckCircle2 className="size-4" />
            ) : (
              <AlertCircle className="size-4" />
            )}
            {state.message}
          </p>
          {state.details?.length ? (
            <ul className="text-muted mt-2 space-y-1 text-xs">
              {state.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
      {pending ? "Rebuilding…" : "Rebuild"}
    </Button>
  );
}
