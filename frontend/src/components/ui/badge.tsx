import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Soft-filled chips. Color is status, never decoration. */
const badgeVariants = cva(
  "inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-sm border px-1.5 text-[0.71875rem] font-medium leading-none tabular-nums",
  {
    variants: {
      tone: {
        neutral: "border-line bg-surface-2 text-fg-muted",
        outline: "border-line-strong bg-transparent text-fg-muted",
        accent: "border-accent-line bg-accent-subtle text-accent-text",
        success: "border-success-line bg-success-bg text-success",
        warning: "border-warning-line bg-warning-bg text-warning",
        danger: "border-danger-line bg-danger-bg text-danger",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
