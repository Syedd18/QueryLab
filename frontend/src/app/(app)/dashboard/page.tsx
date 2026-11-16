"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, Code2, Activity, BarChart3, Trophy } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { dashboardApi, categoriesApi } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
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

  return (
    <Page width="wide">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? ""}`.trim()}
        description="Your progress across all problems."
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Solved" value={(d?.total_solved ?? 0).toLocaleString()} subtitle={`of ${(d?.total_questions ?? 0).toLocaleString()} problems`} loading={isLoading} />
        <StatCard title="Accuracy" value={`${d?.accuracy ?? 0}%`} subtitle="Correct submissions" loading={isLoading} />
        <StatCard title="Streak" value={`${d?.current_streak ?? 0} ${d?.current_streak === 1 ? "day" : "days"}`} subtitle="Consecutive active days" loading={isLoading} />
        <StatCard title="XP" value={(d?.xp ?? 0).toLocaleString()} subtitle="Total experience points" loading={isLoading} />
      </div>

      {/* Contribution heatmap */}
      <Card className="mt-4">
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

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
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

        <Card className="overflow-hidden lg:col-span-3">
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
      <PageHeader title="Dashboard" description="Practice SQL on real databases." />

      <Card className="overflow-hidden">
        <CardBody className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-3 inline-flex size-10 items-center justify-center rounded-lg border border-accent-line bg-accent-subtle text-accent-text">
              <Activity className="size-5" aria-hidden />
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-fg">Start practicing in seconds</h2>
            <p className="mt-1.5 text-sm text-fg-muted">
              Browse {totalProblems ? `${totalProblems} ` : ""}problems and run queries right away. Create a
              free account when you want to save progress, earn XP, and track your streak.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <LinkButton href="/practice" variant="primary" size="lg">
                Browse problems
              </LinkButton>
              <Button variant="secondary" size="lg" onClick={() => openAuth({ mode: "signup" })}>
                Create account
              </Button>
              <Button variant="ghost" size="lg" onClick={() => openAuth({ mode: "login" })}>
                Sign in
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {features.map((f) => (
          <Card key={f.title} className="p-5">
            <div className="mb-3 inline-flex size-8 items-center justify-center rounded-md bg-surface-2 text-fg-subtle">
              <f.icon className="size-4" strokeWidth={1.75} aria-hidden />
            </div>
            <p className="text-sm font-medium text-fg">{f.title}</p>
            <p className="mt-1 text-sm text-fg-subtle">{f.desc}</p>
          </Card>
        ))}
      </div>
    </Page>
  );
}
