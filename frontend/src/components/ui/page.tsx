import * as React from "react";
import { cn } from "@/lib/utils";

const widths = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-[74rem]",
} as const;

export function Page({
  width = "default",
  className,
  children,
}: {
  width?: keyof typeof widths;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full animate-page-in px-4 pb-12 pt-6 sm:px-6 lg:px-10 lg:pt-8",
        widths[width],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Editorial page header: a mono eyebrow names the section, the title is set in
 * the display serif, and actions sit on the baseline to the right.
 */
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-7 flex flex-wrap items-end justify-between gap-x-6 gap-y-4", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-normal tracking-[-0.012em] text-fg sm:text-[2.375rem] sm:leading-[2.5rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-fg-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex items-end justify-between gap-3">
          <div>
            {title && <h2 className="eyebrow">{title}</h2>}
            {description && <p className="mt-1 text-xs text-fg-subtle">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}
