import { Eye } from "lucide-react";
import { stopImpersonating } from "@/app/actions/impersonate";
import type { SessionUser } from "@/lib/session";

export function ImpersonationBanner({ viewer }: { viewer: SessionUser }) {
  return (
    <div className="border-accent-2/40 bg-accent-2/12 text-ink flex items-center justify-center gap-2.5 border-b px-4 py-1.5 text-xs">
      <Eye className="text-accent-2 size-3.5 shrink-0" />
      <span className="truncate">
        Viewing as <strong className="font-semibold">{viewer.name}</strong>
      </span>
      <form action={stopImpersonating}>
        <button
          type="submit"
          className="text-accent-2 shrink-0 font-medium underline-offset-2 hover:underline"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
