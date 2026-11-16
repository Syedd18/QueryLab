import * as React from "react";
import { cn } from "@/lib/utils";

/** The QueryLab mark: a bracket with a query tail. */
export function LogoMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.75"
      strokeLinecap="square"
      strokeLinejoin="miter"
      className={cn("size-6 text-accent", className)}
      aria-hidden
      {...props}
    >
      <path d="M20 13.5V4H4v16h9.5" />
      <path d="M13.5 13.5 21 21" />
    </svg>
  );
}

export function Logo({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark />
      {!compact && (
        <span className="truncate text-md font-semibold tracking-tight text-fg">QueryLab</span>
      )}
    </div>
  );
}
