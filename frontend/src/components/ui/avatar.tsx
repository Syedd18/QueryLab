/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-6 text-[11px]",
  md: "size-8 text-xs",
  lg: "size-12 text-md",
  xl: "size-16 text-lg",
} as const;

export function Avatar({
  name,
  src,
  size = "md",
  className,
}: {
  name?: string | null;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() ?? "?";
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full border border-line bg-surface-3 font-medium text-fg-muted",
        sizes[size],
        className
      )}
      aria-hidden
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initial}
    </span>
  );
}
