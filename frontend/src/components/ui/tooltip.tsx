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
          "pointer-events-none absolute left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs font-medium text-canvas shadow-raised",
          "opacity-0 transition-[opacity,transform] delay-150 duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          side === "bottom"
            ? "top-full mt-2 -translate-y-0.5 group-hover/tt:translate-y-0 group-focus-within/tt:translate-y-0"
            : "bottom-full mb-2 translate-y-0.5 group-hover/tt:translate-y-0 group-focus-within/tt:translate-y-0"
        )}
      >
        {label}
      </span>
    </span>
  );
}
