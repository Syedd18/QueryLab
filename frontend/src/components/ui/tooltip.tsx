"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Minimal hover/focus tooltip. The trigger must be a single focusable element.
 */
export function Tooltip({
  label,
  children,
  side = "bottom",
  className,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom";
  className?: string;
}) {
  const id = React.useId();
  const child = React.cloneElement(children as React.ReactElement<{ "aria-describedby"?: string }>, {
    "aria-describedby": id,
  });
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {child}
      <span
        role="tooltip"
        id={id}
        className={cn(
          "pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs text-fg shadow-overlay",
          "opacity-0 transition-opacity delay-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        )}
      >
        {label}
      </span>
    </span>
  );
}
