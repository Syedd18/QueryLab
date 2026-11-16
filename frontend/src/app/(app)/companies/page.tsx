"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, ArrowRight } from "lucide-react";
import { companiesApi } from "@/lib/api";
import type { CompanyData } from "@/lib/api";
import { CompanyLogo } from "@/components/company";
import { Page, PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

export default function CompaniesPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["companies"],
    queryFn: companiesApi.list,
  });

  const all = data?.companies ?? [];
  const maxCount = all[0]?.question_count || 1;
  const topName = all[0]?.name;

  const companies = useMemo(() => {
    const term = q.trim().toLowerCase();
    return term ? all.filter((c) => c.name.toLowerCase().includes(term)) : all;
  }, [all, q]);

  const open = (name: string) => router.push(`/practice?company=${encodeURIComponent(name)}`);

  const summary = [
    { label: "Companies", value: data ? data.total : "—" },
    { label: "Most asked", value: topName ?? "—" },
    { label: "Top volume", value: all[0] ? `${all[0].question_count} problems` : "—" },
  ];

  return (
    <Page width="wide">
      <PageHeader
        title="Companies"
        description="Practice by where problems are asked. Pick a company to drill its interview set."
      />

      <Card className="mb-4 overflow-hidden">
        <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-3">
          {summary.map((s) => (
            <div key={s.label} className="bg-surface px-5 py-4">
              <p className="text-xs text-fg-subtle">{s.label}</p>
              {isLoading ? (
                <Skeleton className="mt-1.5 h-6 w-24" />
              ) : (
                <p className="mt-1 truncate text-lg font-semibold tracking-tight text-fg">{s.value}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      <div className="mb-4 max-w-sm">
        <Input
          type="search"
          placeholder="Search companies"
          aria-label="Search companies"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          leadingIcon={<Search />}
        />
      </div>

      {isError && (
        <ErrorState
          className="mb-4"
          title="Couldn't load companies"
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState icon={Building2} title="No companies found" description="Try a different search." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {companies.map((c) => (
            <CompanyCard key={c.slug} company={c} maxCount={maxCount} onOpen={() => open(c.name)} />
          ))}
        </div>
      )}
    </Page>
  );
}

function CompanyCard({
  company,
  maxCount,
  onOpen,
}: {
  company: CompanyData;
  maxCount: number;
  onOpen: () => void;
}) {
  const width = Math.max(6, Math.round((company.question_count / maxCount) * 100));
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex items-center gap-3 rounded-lg border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
      aria-label={`${company.name}, ${company.question_count} problems`}
    >
      <CompanyLogo name={company.name} size="lg" className="transition-colors group-hover:border-line-strong" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-fg">{company.name}</p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-accent" style={{ width: `${width}%` }} />
          </div>
          <span className="shrink-0 text-xs text-fg-subtle tabular-nums">{company.question_count}</span>
        </div>
      </div>
      <ArrowRight
        className="size-4 shrink-0 text-fg-faint transition-transform group-hover:translate-x-0.5 group-hover:text-fg-muted"
        aria-hidden
      />
    </button>
  );
}
