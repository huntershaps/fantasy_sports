"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CheckCircle2, Loader2 } from "lucide-react";
import { updateProfile, type ProfileFormState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Crest } from "@/components/ui/crest";

export function ProfileSettings({
  person,
}: {
  person: {
    name: string;
    displayName: string | null;
    bio: string | null;
    image: string | null;
  };
}) {
  const [state, formAction] = useActionState(updateProfile, {} as ProfileFormState);
  // Preview the crest live so the effect of pasting a URL is immediate.
  const [image, setImage] = useState(person.image ?? "");
  const [name, setName] = useState(person.name);

  return (
    <form action={formAction} className="space-y-5">
      <div className="flex items-center gap-4">
        <Crest name={name || person.name} src={image || null} size="2xl" shape="round" />
        <div className="min-w-0">
          <p className="text-sm font-medium">Profile picture</p>
          <p className="text-muted mt-0.5 text-xs leading-relaxed">
            Paste an image URL to use your own. Leave it blank and you keep the
            generated crest, which stays the same forever.
          </p>
        </div>
      </div>

      <Field
        label="Image URL"
        htmlFor="image"
        hint="Must start with http:// or https://"
        error={state.fieldErrors?.image}
      >
        <Input
          id="image"
          name="image"
          value={image}
          onChange={(e) => setImage(e.target.value)}
          placeholder="https://example.com/you.jpg"
          aria-invalid={Boolean(state.fieldErrors?.image)}
        />
      </Field>

      <Field label="Name" htmlFor="name" error={state.fieldErrors?.name}>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </Field>

      <Field
        label="Display name"
        htmlFor="displayName"
        hint="Optional. What your league calls you."
        error={state.fieldErrors?.displayName}
      >
        <Input
          id="displayName"
          name="displayName"
          defaultValue={person.displayName ?? ""}
        />
      </Field>

      <Field label="Bio" htmlFor="bio" error={state.fieldErrors?.bio}>
        <Textarea id="bio" name="bio" defaultValue={person.bio ?? ""} rows={3} />
      </Field>

      <div className="flex items-center gap-3">
        <SubmitButton />
        {state.ok ? (
          <span className="text-win inline-flex items-center gap-1.5 text-xs">
            <CheckCircle2 className="size-3.5" />
            Saved
          </span>
        ) : null}
        {state.error ? (
          <span className="text-loss text-xs" role="alert">
            {state.error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? "Saving…" : "Save profile"}
    </Button>
  );
}
