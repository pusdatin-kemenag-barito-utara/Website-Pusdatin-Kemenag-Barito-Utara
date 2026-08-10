"use client";

import { useUIStore } from "@/stores/ui-store";
import { Moon, Sun } from "lucide-react";

export function ThemeToggleBtn() {
  const { isDark, toggleTheme } = useUIStore();

  return (
    <button
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
