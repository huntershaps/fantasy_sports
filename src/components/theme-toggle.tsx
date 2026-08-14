"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "mfs-theme";

/** Runs before paint so the correct theme class is on <html> for first render. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light")document.documentElement.classList.add("light")}catch(e){}})()`;

/**
 * The theme lives on <html>, set by `themeScript` before first paint, so the
 * class list is the source of truth rather than React state. Subscribing to it
 * keeps the button in sync with the DOM even if something else toggles the
 * theme, and avoids the setState-in-effect cascade that mirroring it would
 * cost. `getServerSnapshot` returns false so hydration matches the server, and
 * React re-reads immediately afterwards.
 */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function ThemeToggle({ className }: { className?: string }) {
  const isLight = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("light"),
    () => false,
  );

  function toggle() {
    // Read the class rather than the rendered value: the subscription updates
    // on a microtask, so two quick clicks would otherwise both compute their
    // "next" from the same stale render and the second would be a no-op.
    const next = !document.documentElement.classList.contains("light");
    // Mutating the class is what updates the component — the subscription above
    // picks it up, so there is no separate piece of state to keep in step.
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`text-faint hover:text-ink grid size-7 shrink-0 place-items-center rounded-md transition-colors ${className ?? ""}`}
      aria-label={`Switch to ${isLight ? "dark" : "light"} theme`}
      aria-pressed={isLight}
    >
      {isLight ? <Moon className="size-3.5" /> : <Sun className="size-3.5" />}
    </button>
  );
}
