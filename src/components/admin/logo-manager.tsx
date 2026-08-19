"use client";

import { useActionState, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check, Loader2, Lock, Undo2, Upload } from "lucide-react";
import { saveLogo, type LogoActionState } from "@/app/actions/logos";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { Crest } from "@/components/ui/crest";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/layout";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@/lib/images";
import type { LeagueLogos, LogoRow } from "@/lib/queries/logos";

export function LogoManager({ leagues }: { leagues: LeagueLogos[] }) {
  if (leagues.length === 0) {
    return (
      <p className="text-muted text-sm">No leagues yet, so there is nothing to dress.</p>
    );
  }

  return (
    <div className="space-y-12">
      {leagues.map((league) => (
        <section key={league.id}>
          <SectionHeader
            label={league.name}
            title="Crests"
            action={
              league.missingCount > 0 ? (
                <span className="text-faint text-xs">
                  {league.missingCount} without a usable logo
                </span>
              ) : (
                <span className="text-win text-xs">Every team has a logo</span>
              )
            }
          />

          <div className="mb-8 space-y-2">
            <p className="label mb-2">The league itself</p>
            <LogoEditor target="league" row={league.logo} shape="shield" />
          </div>

          {league.seasons.map((season) => (
            <div key={season.seasonId} className="mb-8">
              <p className="label mb-2">{season.year} teams</p>
              <div className="space-y-2">
                {season.teams.map((team) => (
                  <LogoEditor key={team.id} target="team" row={team} shape="round" />
                ))}
              </div>
            </div>
          ))}

          {league.franchises.length > 0 ? (
            <div className="mb-8">
              <p className="label mb-1">Franchise crests</p>
              <p className="text-faint mb-2 text-xs">
                A franchise is the through-line behind every name a manager has
                used. Setting one here is optional — it is only a fallback for a
                season with no team logo of its own.
              </p>
              <div className="space-y-2">
                {league.franchises.map((franchise) => (
                  <LogoEditor
                    key={franchise.id}
                    target="franchise"
                    row={franchise}
                    shape="shield"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function LogoEditor({
  target,
  row,
  shape,
}: {
  target: "team" | "franchise" | "league";
  row: LogoRow;
  shape: "shield" | "round";
}) {
  const [state, action] = useActionState(saveLogo, {} as LogoActionState);
  const [mode, setMode] = useState<"upload" | "url">("upload");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <Card variant="bordered" className="p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Crest name={row.name} src={row.logoUrl} size="lg" shape={shape} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {row.isUnservable ? (
              <Badge tone="loss" size="xs">
                <AlertTriangle className="size-3" />
                ESPN will not serve this one
              </Badge>
            ) : null}
            {row.isOverride ? (
              <Badge tone="brand" size="xs">
                <Check className="size-3" />
                Uploaded here
              </Badge>
            ) : null}
            {row.isLocked ? (
              <Badge tone="neutral" size="xs">
                <Lock className="size-3" />
                Sync-protected
              </Badge>
            ) : null}
            {!row.logoUrl ? (
              <span className="text-faint text-xs">No logo — showing the monogram</span>
            ) : null}
          </div>
        </div>
      </div>

      {row.isUnservable ? (
        <p className="text-muted mt-2.5 text-xs leading-relaxed">
          This manager uploaded their own art to ESPN, and ESPN only serves it to
          a signed-in ESPN session — not to this app, even with your cookies.
          Save the image from your ESPN league page and upload it here.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="target" value={target} />
          <input type="hidden" name="targetId" value={row.id} />
          <input type="hidden" name="mode" value={mode} />

          <div className="flex overflow-hidden rounded-md border border-line">
            <ModeTab active={mode === "upload"} onClick={() => setMode("upload")}>
              Upload
            </ModeTab>
            <ModeTab active={mode === "url"} onClick={() => setMode("url")}>
              Link
            </ModeTab>
          </div>

          {mode === "upload" ? (
            <>
              <input
                ref={fileRef}
                type="file"
                name="file"
                accept={IMAGE_ACCEPT_ATTRIBUTE}
                className="sr-only"
                onChange={(event) =>
                  setFileName(event.target.files?.[0]?.name ?? null)
                }
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload />
                {fileName ?? "Choose file"}
              </Button>
            </>
          ) : (
            <Input
              name="logoUrl"
              placeholder="https://…"
              defaultValue={row.isOverride ? "" : (row.logoUrl ?? "")}
              className="h-7 w-56 text-xs"
              aria-label={`Logo URL for ${row.name}`}
            />
          )}

          <SubmitButton />
        </form>

        {row.logoUrl ? (
          <form action={action}>
            <input type="hidden" name="target" value={target} />
            <input type="hidden" name="targetId" value={row.id} />
            <input type="hidden" name="mode" value="clear" />
            <Button type="submit" variant="ghost" size="sm">
              Clear
            </Button>
          </form>
        ) : null}

        {target === "team" && row.canRevert ? (
          <form action={action}>
            <input type="hidden" name="target" value={target} />
            <input type="hidden" name="targetId" value={row.id} />
            <input type="hidden" name="mode" value="revert" />
            <Button type="submit" variant="ghost" size="sm">
              <Undo2 />
              Revert to ESPN
            </Button>
          </form>
        ) : null}
      </div>

      {state.error ? (
        <p className="text-loss mt-2 text-xs" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-win mt-2 text-xs">Saved.</p>
      ) : null}
    </Card>
  );
}

function ModeTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={
        active
          ? "bg-surface-3 text-ink h-7 px-2.5 text-xs font-medium"
          : "text-muted hover:text-ink h-7 px-2.5 text-xs"
      }
    >
      {children}
    </button>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" size="sm" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      Save
    </Button>
  );
}
