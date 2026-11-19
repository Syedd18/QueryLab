import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

/**
 * Restrained KPI tile: label, a proportional-figure value, optional context line.
 */
export function StatCard({ title, value, subtitle, icon: Icon, loading, className }: StatCardProps) {
  return (
    <Card className={cn("px-5 py-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{title}</p>
        {Icon && <Icon className="size-4 text-fg-faint" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-8 w-20" />
      ) : (
        <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-fg tabular-nums">{value}</p>
      )}
      {subtitle && !loading && (
        <p className="mt-0.5 text-xs text-fg-subtle tabular-nums">{subtitle}</p>
      )}
    </Card>
  );
}
