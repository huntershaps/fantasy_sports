"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "mfs-theme";

/** Runs before paint so the correct theme class is on <html> for first render.
 *  Keep in sync with the STORAGE_KEY above. */
export const themeScript = `(function(){try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light")document.documentElement.classList.add("light")}catch(e){}})()`;

export function ThemeToggle({ className }: { className?: string }) {
  const [isLight, setIsLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !isLight;
    document.documentElement.classList.toggle("light", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "light" : "dark");
    } catch {}
    setIsLight(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      className={className}
      aria-label={
        mounted
          ? `Switch to ${isLight ? "dark" : "light"} theme`
          : "Toggle theme"
      }
    >
      {mounted && isLight ? <Moon /> : <Sun />}
    </Button>
  );
}
