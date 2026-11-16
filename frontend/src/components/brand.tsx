import * as React from "react";
import { cn } from "@/lib/utils";

/** The qryntiq mark: a database cylinder fused with an R-style query tail. */
export function LogoMark({
  className,
  ...props
}: React.SVGProps<SVGSVGElement>) {
  const gid = React.useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      className={cn("size-6", className)}
      aria-hidden
      {...props}
    >
      <defs>
        <linearGradient id={`${gid}-cyl`} x1="6" y1="5" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#CBDAEA" />
          <stop offset="1" stopColor="#7C9AB8" />
        </linearGradient>
        <linearGradient id={`${gid}-leg`} x1="20" y1="18" x2="33" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93B3D2" />
          <stop offset="1" stopColor="#5E82A6" />
        </linearGradient>
      </defs>
      {/* cylinder body */}
      <path
        fill={`url(#${gid}-cyl)`}
        d="M6 10.5C6 7.46 11.37 5 18 5s12 2.46 12 5.5v13c0 3.04-5.37 5.5-12 5.5S6 26.54 6 23.5v-13Z"
      />
      {/* top disk */}
      <ellipse cx="18" cy="10.5" rx="12" ry="5.5" fill="#D6E2EF" />
      {/* band separators */}
      <path
        stroke="#5C7E9E"
        strokeWidth="2.1"
        strokeLinecap="round"
        d="M6 16.5c0 3.04 5.37 5.5 12 5.5s12-2.46 12-5.5"
      />
      <path
        stroke="#5C7E9E"
        strokeWidth="2.1"
        strokeLinecap="round"
        d="M6 22.5c0 3.04 5.37 5.5 12 5.5s12-2.46 12-5.5"
      />
      {/* R leg / query tail */}
      <path
        stroke={`url(#${gid}-leg)`}
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.5 18.5 31.5 32.5"
      />
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
        <span className="truncate text-md font-semibold tracking-tight text-fg">qryntiq</span>
      )}
    </div>
  );
}
