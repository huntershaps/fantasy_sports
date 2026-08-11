"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import {
  connectProvider,
  testProviderConnection,
  triggerSync,
  type ProviderActionState,
} from "@/app/actions/providers";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export type ProviderLeague = {
  id: string;
  name: string;
  provider: string;
  providerLeagueId: string | null;
  hasCredentials: boolean;
  credentialHint: string | null;
};

export function ProviderPanel({ leagues }: { leagues: ProviderLeague[] }) {
  const [selectedId, setSelectedId] = useState(leagues[0]?.id ?? "");
  const league = leagues.find((l) => l.id === selectedId) ?? leagues[0];

  const [connectState, connectAction] = useActionState(
    connectProvider,
    {} as ProviderActionState,
  );
  const [testState, testAction] = useActionState(
    testProviderConnection,
    {} as ProviderActionState,
  );
  const [syncState, syncAction] = useActionState(
    triggerSync,
    {} as ProviderActionState,
  );

  if (!league) {
    return <p className="text-muted text-sm">Create a league first.</p>;
  }

  return (
    <div className="space-y-4">
      {leagues.length > 1 ? (
        <Field label="League" htmlFor="league-select">
          <Select
            id="league-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {leagues.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Card variant="bordered" className="p-4">
        <h3 className="text-sm font-semibold">Connect {league.name}</h3>
        <p className="text-muted mt-1 mb-4 text-xs leading-relaxed">
          Cookies are encrypted before they are stored and are never sent back
          to the browser. Leave them blank to keep whatever is already saved.
        </p>

        <form action={connectAction} className="space-y-3">
          <input type="hidden" name="leagueId" value={league.id} />

          <Field label="Provider" htmlFor="provider">
            <Select id="provider" name="provider" defaultValue={league.provider}>
              <option value="ESPN">ESPN Fantasy</option>
              <option value="MANUAL">Manual only</option>
            </Select>
          </Field>

          <Field
            label="League ID"
            htmlFor="providerLeagueId"
            hint="The number after ?leagueId= in your ESPN league URL."
          >
            <Input
              id="providerLeagueId"
              name="providerLeagueId"
              defaultValue={league.providerLeagueId ?? ""}
              placeholder="1893127963"
              required
            />
          </Field>

          <Field
            label="SWID cookie"
            htmlFor="swid"
            hint={
              league.hasCredentials
                ? `Stored: ${league.credentialHint ?? "yes"}. Leave blank to keep it.`
                : "Only needed for private leagues or past seasons. Include the braces."
            }
          >
            <Input id="swid" name="swid" type="password" placeholder="{AAAA-BBBB-…}" autoComplete="off" />
          </Field>

          <Field
            label="espn_s2 cookie"
            htmlFor="espnS2"
            hint="The long value from the espn_s2 cookie on espn.com."
          >
            <Input id="espnS2" name="espnS2" type="password" autoComplete="off" />
          </Field>

          <Submit label="Save connection" pendingLabel="Saving…" />
          <Result state={connectState} />
        </form>
      </Card>

      <Card variant="bordered" className="p-4">
        <h3 className="text-sm font-semibold">Test connection</h3>
        <p className="text-muted mt-1 mb-3 text-xs">
          Checks reachability and authentication. Writes nothing.
        </p>
        <form action={testAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="leagueId" value={league.id} />
          <Field label="Season" htmlFor="test-season" className="w-28">
            <Input
              id="test-season"
              name="season"
              type="number"
              defaultValue={new Date().getFullYear()}
            />
          </Field>
          <Submit label="Test" pendingLabel="Testing…" variant="subtle" />
        </form>
        <Result state={testState} />
      </Card>

      <Card variant="bordered" className="p-4">
        <h3 className="text-sm font-semibold">Run a sync</h3>
        <p className="text-muted mt-1 mb-3 text-xs leading-relaxed">
          Imports seasons and re-runs the event engine. Safe to repeat —
          existing rows are updated in place and manual corrections are kept.
        </p>
        <form action={syncAction} className="space-y-3">
          <input type="hidden" name="leagueId" value={league.id} />
          <Field
            label="Seasons"
            htmlFor="seasons"
            hint="Comma separated, e.g. 2025,2026. Leave blank to import every season the provider offers."
          >
            <Input id="seasons" name="seasons" placeholder="2026" />
          </Field>
          <label className="text-muted flex items-center gap-2 text-xs">
            <input type="checkbox" name="withBoxScores" className="accent-brand" />
            Include weekly box scores (slower — one request per played week)
          </label>
          <Submit label="Sync now" pendingLabel="Syncing…" icon />
          <Result state={syncState} />
        </form>
      </Card>
    </div>
  );
}

function Submit({
  label,
  pendingLabel,
  variant = "primary",
  icon,
}: {
  label: string;
  pendingLabel: string;
  variant?: "primary" | "subtle";
  icon?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : icon ? <RefreshCw /> : null}
      {pending ? pendingLabel : label}
    </Button>
  );
}

function Result({ state }: { state: ProviderActionState }) {
  if (state.ok === undefined) return null;
  return (
    <div
      role="status"
      className={`mt-3 rounded-md border p-2.5 text-xs ${
        state.ok ? "border-win/30 text-win" : "border-loss/30 text-loss"
      }`}
    >
      <p className="flex items-center gap-1.5 font-medium">
        {state.ok ? <CheckCircle2 className="size-3.5" /> : <AlertCircle className="size-3.5" />}
        {state.message}
      </p>
      {state.detail?.length ? (
        <ul className="text-muted mt-1.5 space-y-0.5">
          {state.detail.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
