"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  onChange,
  total,
  label = "items",
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  total?: number;
  label?: string;
  className?: string;
}) {
  if (totalPages <= 1 && total === undefined) return null;
  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-between gap-3 text-xs text-fg-subtle", className)}
    >
      <span className="tabular-nums">
        {total !== undefined ? `${total.toLocaleString()} ${label} · ` : ""}
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
