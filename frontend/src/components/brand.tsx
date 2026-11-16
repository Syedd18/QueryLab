import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The qryntiq mark: a monogram "q" drawn as a query loop (ring + stem) encircling
 * a single steel-blue data node, set in a premium graphite app-icon tile.
 */
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
        <linearGradient id={`${gid}-tile`} x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#222A31" />
          <stop offset="1" stopColor="#0F141A" />
        </linearGradient>
        <linearGradient id={`${gid}-glyph`} x1="11" y1="9" x2="29" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EEF3F8" />
          <stop offset="1" stopColor="#A6BDD5" />
        </linearGradient>
      </defs>
      {/* app-icon tile */}
      <rect x="1" y="1" width="38" height="38" rx="11" fill={`url(#${gid}-tile)`} />
      <rect x="1.5" y="1.5" width="37" height="37" rx="10.5" fill="none" stroke="#333D47" strokeWidth="1" />
      {/* faint top highlight for depth */}
      <path d="M12 2.5h16" stroke="#56626D" strokeWidth="1" strokeLinecap="round" opacity="0.55" />
      {/* q bowl — the query loop */}
      <circle cx="17.2" cy="18" r="6.9" fill="none" stroke={`url(#${gid}-glyph)`} strokeWidth="3.3" />
      {/* q stem / descender, right-tangent to the bowl */}
      <path
        d="M24.1 12.4V29.6"
        stroke={`url(#${gid}-glyph)`}
        strokeWidth="3.3"
        strokeLinecap="round"
      />
      {/* steel node capping the stem — echoes the wordmark dot */}
      <circle cx="24.1" cy="11.7" r="2.15" fill="#7E9CBD" />
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
