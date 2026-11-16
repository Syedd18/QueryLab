import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* Semantic status block: soft fill, titled, explicit. */
const calloutVariants = cva("rounded-md px-4 py-3 text-sm", {
  variants: {
    tone: {
      success: "bg-success-bg [&_[data-title]]:text-success",
      warning: "bg-warning-bg [&_[data-title]]:text-warning",
      danger: "bg-danger-bg [&_[data-title]]:text-danger",
      info: "bg-accent-subtle [&_[data-title]]:text-accent-text",
      neutral: "bg-surface-2 [&_[data-title]]:text-fg",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Callout({
  tone,
  title,
  description,
  action,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof calloutVariants> & {
    title?: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
  }) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cn(calloutVariants({ tone }), className)}
      {...props}
    >
      {title && (
        <p data-title className="font-medium">
          {title}
        </p>
      )}
      {description && <p className={cn("text-xs text-fg-muted", title && "mt-0.5")}>{description}</p>}
      {children}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
