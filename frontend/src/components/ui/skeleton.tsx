import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-3 motion-reduce:animate-none",
        className
      )}
      {...props}
    />
  );
}

/** Rows of a table while it loads. */
export function SkeletonRows({
  rows = 6,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-line last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-3 py-2.5">
              <Skeleton className={cn("h-3.5", c === 0 ? "w-3/4" : "w-1/2")} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
