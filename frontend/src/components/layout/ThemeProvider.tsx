
import { useEffect } from "react";
import { useUIStore } from "@/stores/ui-store";

export function ThemeProvider() {
  const isDark = useUIStore((s) => s.isDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return null;
}
