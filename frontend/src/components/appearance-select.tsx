"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { ChevronDown } from "lucide-react";

/** Compact theme picker for the sidebar footer: "Appearance  Dark ⌄". */
export function AppearanceSelect({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <label className={className}>
      <span className="sr-only">Appearance</span>
      <span className="relative inline-flex items-center">
        <select
          value={mounted ? theme ?? "system" : "system"}
          onChange={(e) => setTheme(e.target.value)}
          className="h-7 cursor-pointer appearance-none rounded-sm border border-transparent bg-transparent pl-2 pr-6 text-xs text-fg-muted transition-colors hover:bg-surface-3 hover:text-fg focus-visible:shadow-none focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="dark">Dark</option>
          <option value="light">Light</option>
          <option value="system">System</option>
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 size-3.5 text-fg-faint" aria-hidden />
      </span>
    </label>
  );
}
