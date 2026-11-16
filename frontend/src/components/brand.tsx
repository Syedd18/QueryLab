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
      {/* top disk + rim highlight */}
      <ellipse cx="18" cy="10.5" rx="12" ry="5.5" fill="#D6E2EF" />
      <ellipse cx="18" cy="10" rx="9" ry="3.6" fill="none" stroke="#EAF1F7" strokeWidth="1.1" opacity="0.7" />
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

/** The qryntiq logotype: Space Grotesk, tight tracking, accent dot on the i. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "select-none font-brand text-[1.0625rem] font-semibold leading-none tracking-[-0.015em] text-fg",
        className
      )}
    >
      qrynt
      <span className="relative inline-block">
        {"ı"}
        <span
          aria-hidden
          className="absolute left-1/2 top-[0.14em] size-[0.16em] -translate-x-1/2 rounded-full bg-accent-text"
        />
      </span>
      q
    </span>
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
    <div className={cn("flex items-center gap-2", className)}>
      <LogoMark />
      {!compact && <Wordmark />}
    </div>
  );
}
