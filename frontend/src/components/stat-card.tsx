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
    <Card className={cn("px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-fg-subtle">{title}</p>
        {Icon && <Icon className="size-4 text-fg-faint" aria-hidden />}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-7 w-20" />
      ) : (
        <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">{value}</p>
      )}
      {subtitle && !loading && (
        <p className="mt-0.5 text-xs text-fg-subtle tabular-nums">{subtitle}</p>
      )}
    </Card>
  );
}
