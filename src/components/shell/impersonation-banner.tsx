import { Eye } from "lucide-react";
import { stopImpersonating } from "@/app/actions/impersonate";
import type { SessionUser } from "@/lib/session";

export function ImpersonationBanner({ viewer }: { viewer: SessionUser }) {
  return (
    <div className="bg-violet flex items-center justify-center gap-3 px-4 py-2 text-center text-sm font-medium text-white">
      <Eye className="size-4 shrink-0" />
      <span className="truncate">
        Viewing the site as <strong>{viewer.name}</strong>
      </span>
      <form action={stopImpersonating}>
        <button
          type="submit"
          className="shrink-0 rounded-md bg-white/20 px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-white/30"
        >
          Exit
        </button>
      </form>
    </div>
  );
}
