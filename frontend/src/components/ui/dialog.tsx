"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "./button";
import { fade, pop, quick, normal } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  headerless = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  /** Render children edge-to-edge with a floating close button; title/description stay for screen readers. */
  headerless?: boolean;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            {...fade}
            transition={quick}
            className="absolute inset-0 bg-[rgb(20_20_22/0.42)] dark:bg-[rgb(0_0_0/0.62)]"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            {...pop}
            transition={normal}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            tabIndex={-1}
            className={cn(
              "relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface shadow-[var(--highlight),var(--shadow-overlay)] outline-none",
              className
            )}
          >
            {headerless ? (
              <>
                <h2 id={titleId} className="sr-only">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="sr-only">
                    {description}
                  </p>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 z-10 text-fg-subtle"
                >
                  <X />
                </Button>
                {children}
                {footer && (
                  <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-surface-2/50 px-6 py-3.5">
                    {footer}
                  </div>
                )}
              </>
            ) : (
            <>
            <div className="flex items-start justify-between gap-4 px-6 pt-5">
              <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em] text-fg">
                  {title}
                </h2>
                {description && (
                  <p id={descId} className="mt-1 text-sm leading-5 text-fg-muted">
                    {description}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close" className="-mr-2 -mt-1">
                <X />
              </Button>
            </div>
            {children && <div className="px-6 pb-5 pt-4 text-sm">{children}</div>}
            {footer && (
              <div className="flex justify-end gap-2 rounded-b-xl border-t border-line bg-surface-2/50 px-6 py-3.5">
                {footer}
              </div>
            )}
            </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
