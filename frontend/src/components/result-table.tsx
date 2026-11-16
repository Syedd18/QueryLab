"use client";

import { useState, useMemo, useEffect } from "react";
import { Check, Copy, ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableHeaderCell, useSort } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface ResultTableProps {
  columns: string[];
  rows: unknown[][];
  executionTime?: number;
  error?: string | null;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

const PAGE_SIZE = 50;

/**
 * Dense result grid for query output: sticky header, mono cells, sortable
 * columns, client-side paging, copy as CSV.
 */
export function ResultTable({
  columns,
  rows,
  executionTime,
  error,
  emptyTitle = "No output yet",
  emptyDescription = "Run a query to see its result here.",
  className,
}: ResultTableProps) {
  const { sort, toggle, sortedFor } = useSort<string>();
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => setPage(1), [rows, sort]);

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const idx = Number(sort.key);
    return [...rows].sort((a, b) => {
      const aVal = a[idx];
      const bVal = b[idx];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE));
  const pageRows = sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const copyCSV = () => {
    const header = columns.join(",");
    const body = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "")}"`).join(","))
      .join("\n");
    navigator.clipboard.writeText(`${header}\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (error) {
    return (
      <div className={cn("p-3", className)} role="alert">
        <div className="rounded-md border border-danger-line bg-danger-bg px-3 py-2.5">
          <p className="text-xs font-medium text-danger">Query failed</p>
          <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs leading-5 text-fg-muted">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (columns.length === 0) {
    return (
      <EmptyState
        compact
        icon={Terminal}
        title={emptyTitle}
        description={emptyDescription}
        className={cn("h-full", className)}
      />
    );
  }

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-line px-3 text-xs text-fg-subtle">
        <span className="tabular-nums">
          {rows.length.toLocaleString()} {rows.length === 1 ? "row" : "rows"}
          {executionTime !== undefined && <> · {executionTime.toFixed(1)} ms</>}
        </span>
        <Button variant="ghost" size="sm" onClick={copyCSV} className="-mr-1.5">
          {copied ? <Check className="text-success" /> : <Copy />}
          {copied ? "Copied" : "Copy CSV"}
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 border-b border-r border-line bg-surface-2 px-2 text-right text-xs font-normal text-fg-faint tabular-nums">
                #
              </th>
              {columns.map((col, i) => (
                <TableHeaderCell
                  key={i}
                  sortable
                  sorted={sortedFor(String(i))}
                  onSort={() => toggle(String(i))}
                  className="h-8 font-mono font-medium normal-case"
                >
                  {col}
                </TableHeaderCell>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono">
            {pageRows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-surface-2">
                <td className="border-b border-r border-line px-2 py-1.5 text-right text-fg-faint tabular-nums">
                  {(page - 1) * PAGE_SIZE + rowIdx + 1}
                </td>
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="max-w-[320px] truncate border-b border-line px-3 py-1.5 text-fg tabular-nums"
                    title={cell === null ? undefined : String(cell)}
                  >
                    {cell === null || cell === undefined ? (
                      <span className="italic text-fg-faint">NULL</span>
                    ) : (
                      String(cell)
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex h-9 shrink-0 items-center justify-between border-t border-line px-3 text-xs text-fg-subtle">
          <span className="tabular-nums">
            Rows {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of{" "}
            {rows.length.toLocaleString()}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className="tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
