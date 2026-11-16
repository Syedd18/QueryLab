"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  count?: number;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  variant?: "underline" | "segmented";
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/**
 * Controlled tabs. `underline` for panel navigation (elevated active tab with a
 * 2px accent rule), `segmented` for small filter groups. Arrow keys move focus.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = "underline",
  size = "md",
  className,
  ...rest
}: TabsProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const enabled = items.map((it, i) => (it.disabled ? -1 : i)).filter((i) => i >= 0);
    const pos = enabled.indexOf(index);
    let next = index;
    if (e.key === "ArrowRight") next = enabled[(pos + 1) % enabled.length];
    if (e.key === "ArrowLeft") next = enabled[(pos - 1 + enabled.length) % enabled.length];
    if (e.key === "Home") next = enabled[0];
    if (e.key === "End") next = enabled[enabled.length - 1];
    refs.current[next]?.focus();
    onChange(items[next].id);
  };

  if (variant === "segmented") {
    return (
      <div
        role="tablist"
        aria-label={rest["aria-label"]}
        className={cn("inline-flex items-center gap-0.5 rounded-md bg-surface-2 p-0.5", className)}
      >
        {items.map((item, i) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              disabled={item.disabled}
              onClick={() => onChange(item.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-sm px-2.5 font-medium transition-colors disabled:opacity-50",
                size === "sm" ? "h-6 text-xs" : "h-7 text-sm",
                active ? "bg-surface text-fg shadow-[0_0_0_1px_var(--line)]" : "text-fg-subtle hover:text-fg"
              )}
            >
              {item.label}
              {item.count !== undefined && <span className="tabular-nums text-fg-faint">{item.count}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label={rest["aria-label"]}
      className={cn("flex items-end gap-1 border-b border-line", className)}
    >
      {items.map((item, i) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative -mb-px inline-flex items-center gap-1.5 rounded-t-sm border-b-2 px-3 font-medium transition-colors disabled:opacity-50",
              size === "sm" ? "h-8 text-xs" : "h-9 text-sm",
              active
                ? "border-accent bg-surface-2 text-fg"
                : "border-transparent text-fg-subtle hover:bg-surface-2 hover:text-fg"
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="tabular-nums text-fg-faint">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
