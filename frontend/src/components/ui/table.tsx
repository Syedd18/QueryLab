"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc";

export function Table({
  className,
  containerClassName,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement> & { containerClassName?: string }) {
  return (
    <div className={cn("relative w-full overflow-auto", containerClassName)}>
      <table
        className={cn("w-full caption-bottom text-sm tabular-nums", className)}
        {...props}
      />
    </div>
  );
}

export function TableHead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("sticky top-0 z-10", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({
  className,
  interactive,
  selected,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & {
  interactive?: boolean;
  selected?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-line last:border-b-0 transition-colors duration-150 hover:bg-surface-2/60",
        interactive && "cursor-pointer hover:bg-surface-2",
        selected && "bg-accent-subtle hover:bg-accent-subtle",
        className
      )}
      aria-selected={selected || undefined}
      {...props}
    />
  );
}

type HeaderCellProps = React.ThHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
  sortable?: boolean;
  sorted?: SortDirection | false;
  onSort?: () => void;
};

export function TableHeaderCell({
  className,
  align = "left",
  sortable,
  sorted = false,
  onSort,
  children,
  ...props
}: HeaderCellProps) {
  const alignClass =
    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  const ariaSort = sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined;

  return (
    <th
      scope="col"
      aria-sort={sortable ? ariaSort ?? "none" : undefined}
      className={cn(
        "h-9 whitespace-nowrap border-b border-line bg-surface-2 px-4 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-fg-subtle",
        alignClass,
        className
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "group -mx-1 inline-flex h-6 items-center gap-1 rounded-sm px-1 [letter-spacing:inherit] [text-transform:inherit] transition-colors hover:text-fg",
            sorted && "text-fg",
            align === "right" && "flex-row-reverse"
          )}
        >
          {children}
          {sorted === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : sorted === "desc" ? (
            <ArrowDown className="size-3" aria-hidden />
          ) : (
            <ArrowUpDown
              className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
              aria-hidden
            />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function TableCell({
  className,
  align = "left",
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & {
  align?: "left" | "right" | "center";
}) {
  return (
    <td
      className={cn(
        "px-4 py-2.5 align-middle text-fg",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className
      )}
      {...props}
    />
  );
}

/** Small hook for client-side column sorting. */
export function useSort<K extends string>(initial?: { key: K; dir: SortDirection }) {
  const [sort, setSort] = React.useState<{ key: K; dir: SortDirection } | null>(
    initial ?? null
  );
  const toggle = (key: K) =>
    setSort((s) =>
      s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  const sortedFor = (key: K): SortDirection | false =>
    sort?.key === key ? sort.dir : false;
  return { sort, toggle, sortedFor };
}
