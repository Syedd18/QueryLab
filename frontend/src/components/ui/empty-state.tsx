import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Callout } from "./callout";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "px-4 py-8" : "px-6 py-16",
        className
      )}
    >
      {Icon && (
        <div className="relative mb-4">
          <div
            aria-hidden
            className="absolute -inset-2.5 rounded-[14px] border border-dashed border-line"
          />
          <div className="relative flex size-10 items-center justify-center rounded-lg border border-line bg-surface text-fg-muted shadow-[var(--highlight),var(--shadow-card)]">
            <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />
          </div>
        </div>
      )}
      <p className="text-sm font-semibold text-fg">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-5 text-fg-subtle">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Callout tone="danger" title={title} description={description} action={action} className={className} />
  );
}
