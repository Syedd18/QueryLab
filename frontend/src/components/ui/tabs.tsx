"use client";

import * as React from "react";
import { motion } from "framer-motion";
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

const slide = { type: "spring", stiffness: 520, damping: 42, mass: 0.7 } as const;

/**
 * Controlled tabs. `underline` for panel navigation (an ink rule slides to the
 * active tab), `segmented` for small filter groups (a raised pill slides).
 * Arrow keys, Home and End move focus.
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
  const layoutId = React.useId();

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
        className={cn(
          "inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-2 p-0.5",
          className
        )}
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
                "relative inline-flex items-center justify-center gap-1.5 rounded-[5px] px-2.5 font-medium transition-colors duration-150 disabled:opacity-45",
                size === "sm" ? "h-6 text-xs" : "h-7 text-sm",
                active ? "text-fg" : "text-fg-subtle hover:text-fg"
              )}
            >
              {active && (
                <motion.span
                  layoutId={`seg-${layoutId}`}
                  transition={slide}
                  className="absolute inset-0 rounded-[5px] border border-line bg-surface shadow-[var(--highlight),var(--shadow-xs)]"
                  aria-hidden
                />
              )}
              <span className="relative inline-flex items-center gap-1.5">
                {item.label}
                {item.count !== undefined && (
                  <span className="tabular-nums text-fg-faint">{item.count}</span>
                )}
              </span>
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
              "relative -mb-px inline-flex items-center gap-1.5 px-2.5 font-medium transition-colors duration-150 disabled:opacity-40",
              size === "sm" ? "h-9 text-xs" : "h-10 text-sm",
              active ? "text-fg" : "text-fg-subtle hover:text-fg"
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="tabular-nums text-fg-faint">{item.count}</span>}
            {active && (
              <motion.span
                layoutId={`ul-${layoutId}`}
                transition={slide}
                className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-fg"
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
