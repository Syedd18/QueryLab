"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Code2, Activity, BarChart3, Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { dashboardApi, categoriesApi } from "@/lib/api";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { ActivityHeatmap } from "@/components/charts/activity-heatmap";
import { Page, PageHeader } from "@/components/ui/page";
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { formatRelativeTime, cn } from "@/lib/utils";

export default function DashboardPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <Page width="wide">
        <Skeleton className="h-7 w-40" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </Page>
    );
  }

  return isAuthenticated ? <MemberDashboard /> : <GuestDashboard />;
}

function MemberDashboard() {
  const { user } = useAuth();
  const { data: d, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  const difficulty = [
    { label: "Easy", solved: d?.easy_solved ?? 0, total: d?.easy_total ?? 0, fill: "bg-success", track: "bg-success-bg" },
    { label: "Medium", solved: d?.medium_solved ?? 0, total: d?.medium_total ?? 0, fill: "bg-warning", track: "bg-warning-bg" },
    { label: "Hard", solved: d?.hard_solved ?? 0, total: d?.hard_total ?? 0, fill: "bg-danger", track: "bg-danger-bg" },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = user?.name?.split(" ")[0] ?? "";
  const solvedPct =
    d && d.total_questions > 0 ? Math.round((d.total_solved / d.total_questions) * 100) : 0;

  const kpis = [
    {
      label: "Solved",
      value: (d?.total_solved ?? 0).toLocaleString(),
      sub: `of ${(d?.total_questions ?? 0).toLocaleString()} problems · ${solvedPct}%`,
    },
    { label: "Accuracy", value: `${d?.accuracy ?? 0}%`, sub: "Correct submissions" },
    {
      label: "Streak",
      value: `${d?.current_streak ?? 0}`,
      unit: d?.current_streak === 1 ? "day" : "days",
      sub: "Consecutive active days",
    },
    { label: "Experience", value: (d?.xp ?? 0).toLocaleString(), unit: "XP", sub: "Earned from solved problems" },
  ];

  return (
    <Page width="wide">
      <PageHeader
        eyebrow="Overview"
        title={
          <>
            {greeting}
            {firstName && <span className="italic text-fg-muted">, {firstName}</span>}
          </>
        }
        description="Where you stand across the problem library, and what you worked on last."
        actions={
          <LinkButton href="/practice" variant="primary" size="md">
            <Code2 />
            Continue practicing
          </LinkButton>
        }
      />

      {isError && (
        <ErrorState
          className="mb-6"
          title="Couldn't load your dashboard"
          description="The server didn't respond. Check that the API is running and try again."
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* KPI strip — one instrument panel rather than four loose tiles */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="bg-surface px-5 py-4">
              <p className="eyebrow">{k.label}</p>
              {isLoading ? (
                <Skeleton className="mt-2.5 h-8 w-20" />
              ) : (
                <p className="mt-2 flex items-baseline gap-1.5 text-[1.75rem] font-semibold leading-8 tracking-[-0.025em] text-fg tabular-nums">
                  {k.value}
                  {k.unit && <span className="text-sm font-medium tracking-normal text-fg-subtle">{k.unit}</span>}
                </p>
              )}
              <p className="mt-1 truncate text-xs text-fg-subtle tabular-nums">{k.sub}</p>
            </div>
          ))}
        </div>
        {/* overall completion rule */}
        <div className="h-1 bg-surface-2" aria-hidden>
          <div
            className="h-full bg-accent-text/70 transition-[width] duration-700 ease-out"
            style={{ width: `${isLoading ? 0 : solvedPct}%` }}
          />
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* Contribution heatmap */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>Activity</CardTitle>
              <CardDescription>Submissions over the last 26 weeks</CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {isLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <ActivityHeatmap data={d?.activity_calendar ?? []} />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>By difficulty</CardTitle>
              <CardDescription>Solved out of available</CardDescription>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {difficulty.map((item) => {
              const pct = item.total > 0 ? Math.round((item.solved / item.total) * 100) : 0;
              return (
                <div key={item.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-fg">{item.label}</span>
                    <span className="text-fg-subtle tabular-nums">
                      {isLoading ? <Skeleton className="inline-block h-3 w-12" /> : `${item.solved} / ${item.total}`}
                      <span className="ml-2 inline-block w-9 text-right text-fg-faint">{pct}%</span>
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={`${item.label} progress`}
                    aria-valuemin={0}
                    aria-valuemax={item.total}
                    aria-valuenow={item.solved}
                    className={cn("h-1.5 overflow-hidden rounded-full", item.track)}
                  >
                    <div className={cn("h-full rounded-full transition-[width] duration-200 ease-out", item.fill)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <div className="mt-4">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent submissions</CardTitle>
            <LinkButton href="/practice" variant="ghost" size="sm">
              Open practice
            </LinkButton>
          </CardHeader>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-24">Result</TableHeaderCell>
                <TableHeaderCell>Problem</TableHeaderCell>
                <TableHeaderCell align="right" className="w-28">When</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <SkeletonRows rows={5} columns={3} />
              ) : (d?.recent_submissions ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="p-0">
                    <EmptyState
                      icon={Code2}
                      title="No submissions yet"
                      description="Solve your first problem and it will show up here."
                      action={
                        <LinkButton href="/practice" variant="primary" size="sm">
                          Start practicing
                        </LinkButton>
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                (d?.recent_submissions ?? []).map((sub, i) => (
                  <TableRow key={sub.id || i}>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5 text-sm">
                        {sub.is_correct ? (
                          <>
                            <CheckCircle2 className="size-4 text-success" aria-hidden />
                            <span className="text-fg-muted">Passed</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="size-4 text-danger" aria-hidden />
                            <span className="text-fg-muted">Failed</span>
                          </>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{sub.question_title}</span>
                        <DifficultyBadge difficulty={sub.question_difficulty} />
                      </div>
                    </TableCell>
                    <TableCell align="right" className="text-fg-subtle">
                      {formatRelativeTime(sub.created_at)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </Page>
  );
}

function GuestDashboard() {
  const { openAuth } = useAuthModal();
  const { data: categories } = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const totalProblems = (categories ?? []).reduce((s, c) => s + c.question_count, 0);

  const features = [
    { icon: Code2, title: "Real execution", desc: "Run queries against real databases and see results instantly — no account needed." },
    { icon: BarChart3, title: "Track progress", desc: "Sign in to save submissions, build streaks, and see your activity heatmap." },
    { icon: Trophy, title: "Compete", desc: "Earn XP for solved problems and climb the leaderboard." },
  ];

  return (
    <Page width="wide">
      {/* Editorial hero */}
      <section className="relative overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--highlight),var(--shadow-card)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line-strong)_1px,transparent_0)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_at_85%_20%,black,transparent_60%)] opacity-70"
        />
        <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-12 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="eyebrow">
              <Activity className="mr-1.5 inline size-3 -translate-y-px" aria-hidden />
              The SQL workspace
            </p>
            <h1 className="mt-3 font-display text-4xl font-normal tracking-[-0.015em] text-fg sm:text-[3.25rem] sm:leading-[3.4rem]">
              Write sharper SQL,
              <br />
              <span className="italic text-fg-muted">one query at a time.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-fg-muted">
              {totalProblems ? `${totalProblems.toLocaleString()} interview-grade` : "Interview-grade"} problems,
              run against real databases in your browser. No account needed to start — create one when you want to keep your
              progress.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <LinkButton href="/practice" variant="primary" size="lg" className="group">
                Browse problems
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" aria-hidden />
              </LinkButton>
              <Button variant="secondary" size="lg" onClick={() => openAuth({ mode: "signup" })}>
                Create account
              </Button>
              <Button variant="ghost" size="lg" onClick={() => openAuth({ mode: "login" })}>
                Sign in
              </Button>
            </div>
          </div>

          {/* A real query, set like a specimen */}
          <figure className="hidden overflow-hidden rounded-lg border border-line bg-canvas font-mono text-xs leading-6 lg:block">
            <figcaption className="flex h-8 items-center justify-between border-b border-line px-3">
              <span className="font-mono text-2xs text-fg-subtle">query.sql</span>
              <span className="flex gap-1" aria-hidden>
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
              </span>
            </figcaption>
            <pre className="px-4 py-3 text-fg-muted">
              <span className="text-accent-text">SELECT</span> department, <span className="text-accent-text">AVG</span>(salary){"\n"}
              <span className="text-accent-text">FROM</span>   employees{"\n"}
              <span className="text-accent-text">GROUP BY</span> department{"\n"}
              <span className="text-accent-text">HAVING</span> <span className="text-accent-text">COUNT</span>(*) &gt; <span className="text-warning">5</span>{"\n"}
              <span className="text-accent-text">ORDER BY</span> <span className="text-fg-faint">2</span> <span className="text-accent-text">DESC</span>;
            </pre>
            <div className="flex items-center justify-between border-t border-line px-3 py-1.5 text-2xs text-fg-subtle">
              <span>4 rows · 3.1 ms</span>
              <span className="inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-3" aria-hidden /> Correct
              </span>
            </div>
          </figure>
        </div>
      </section>

      {/* What you get — one strip, three columns */}
      <Card className="mt-4 overflow-hidden">
        <div className="grid gap-px bg-line sm:grid-cols-3">
          {features.map((f, i) => (
            <div key={f.title} className="bg-surface p-6">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-fg-faint tabular-nums">0{i + 1}</span>
                <span className="h-px flex-1 bg-line" aria-hidden />
                <f.icon className="size-4 text-fg-subtle" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="mt-4 text-sm font-semibold text-fg">{f.title}</p>
              <p className="mt-1 text-sm leading-6 text-fg-subtle">{f.desc}</p>
            </div>
          ))}
        </div>
      </Card>
    </Page>
  );
}
