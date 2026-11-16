"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Table as TableIcon,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Link as LinkIcon,
  Calculator,
  GitBranch,
  Columns,
  Layers,
  Box,
  FolderOpen,
  ArrowRight,
  Check,
} from "lucide-react";
import { categoriesApi } from "@/lib/api";
import type { CategoryData } from "@/lib/api";
import { Page, PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ElementType> = {
  Table: TableIcon,
  Filter,
  ArrowUpDown,
  LayoutGrid,
  Link: LinkIcon,
  Calculator,
  GitBranch,
  Columns,
  Layers,
  Box,
};

export default function CategoriesPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const cats = useMemo(
    () => (data ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
    [data]
  );
  const totals = useMemo(
    () =>
      cats.reduce(
        (acc, c) => ({ q: acc.q + c.question_count, s: acc.s + c.solved_count }),
        { q: 0, s: 0 }
      ),
    [cats]
  );
  const overall = totals.q > 0 ? Math.round((totals.s / totals.q) * 100) : 0;

  const summary = [
    { label: "Topics", value: cats.length },
    { label: "Solved", value: totals.s },
    { label: "Problems", value: totals.q },
    { label: "Completion", value: `${overall}%` },
  ];

  return (
    <Page width="wide">
      <PageHeader
        title="SQL Topics"
        description="Master SQL one concept at a time — from basic selects to window functions."
      />

      {/* Summary strip */}
      <Card className="mb-4 overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
          {summary.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <p className="text-xs text-fg-subtle">{s.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1.5 h-6 w-16" />
              ) : (
                <p className="mt-1 text-xl font-semibold tracking-tight text-fg tabular-nums">{s.value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {isError && (
        <ErrorState
          className="mb-4"
          title="Couldn't load topics"
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px]" />
          ))}
        </div>
      ) : cats.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState icon={FolderOpen} title="No topics yet" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} onOpen={() => router.push(`/practice?category=${cat.id}`)} />
          ))}
        </div>
      )}
    </Page>
  );
}

function CategoryCard({ cat, onOpen }: { cat: CategoryData; onOpen: () => void }) {
  const Icon = iconMap[cat.icon || "Table"] || TableIcon;
  const pct = cat.question_count > 0 ? Math.round((cat.solved_count / cat.question_count) * 100) : 0;
  const complete = pct >= 100 && cat.question_count > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
    >
      <div className="flex items-start justify-between">
        <span className="flex size-10 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-muted transition-colors group-hover:text-fg">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="relative flex items-center justify-center">
          <ProgressRing value={pct} size={44} stroke={4} barClass={complete ? "stroke-success" : "stroke-accent"} />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-fg tabular-nums">
            {complete ? <Check className="size-4 text-success" aria-label="Complete" /> : `${pct}%`}
          </span>
        </div>
      </div>

      <h3 className="mt-4 text-sm font-semibold text-fg">{cat.name}</h3>
      {cat.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-fg-subtle">{cat.description}</p>
      )}

      <div className="mt-auto pt-4">
        <div className="h-1 overflow-hidden rounded-full bg-surface-3">
          <div
            className={cn("h-full rounded-full transition-[width] duration-500 ease-out", complete ? "bg-success" : "bg-accent")}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-xs text-fg-subtle tabular-nums">
            {cat.solved_count} / {cat.question_count} solved
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-fg-muted transition-colors group-hover:text-fg">
            {complete ? <Badge tone="success">Complete</Badge> : "Practice"}
            <ArrowRight className="size-3.5 text-fg-faint transition-transform group-hover:translate-x-0.5 group-hover:text-fg-muted" aria-hidden />
          </span>
        </div>
      </div>
    </button>
  );
}
