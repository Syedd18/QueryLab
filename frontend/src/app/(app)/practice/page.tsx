"use client";

import { Suspense, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { questionsApi, sqlApi, bookmarksApi, categoriesApi } from "@/lib/api";
import type { QuestionListItem, QuestionDetail, ExecuteResult, SubmitResult } from "@/lib/api";
import { SQLEditor } from "@/components/sql-editor";
import { ResultTable } from "@/components/result-table";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { TableHeaderCell, useSort } from "@/components/ui/table";
import { fade, quick } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  Play,
  Send,
  RotateCcw,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  XCircle,
  Circle,
  Search,
  List,
  ChevronDown,
  ChevronUp,
  Code2,
  Maximize2,
  Minimize2,
  Eye,
  Lightbulb,
  Copy,
  X,
  Flag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { SchemaView } from "@/components/schema-view";
import { CompanyChip } from "@/components/company";
import { ReportDialog } from "@/components/report-dialog";

type Difficulty = "Easy" | "Medium" | "Hard";
const DIFFICULTY_ORDER: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2 };

type LeftTab = "description" | "schema" | "hint" | "solution";
type ResultsTab = "output" | "expected";

export default function PracticePage() {
  return (
    <Suspense fallback={<PracticeSkeleton />}>
      <PracticeScreen />
    </Suspense>
  );
}

function PracticeSkeleton() {
  return (
    <div className="flex h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-3.5rem)]">
      <div className="hidden w-[420px] shrink-0 border-r border-line bg-surface p-4 md:block">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-4 h-8 w-full" />
        <Skeleton className="mt-3 h-3.5 w-3/4" />
        <Skeleton className="mt-2 h-3.5 w-2/3" />
      </div>
      <div className="flex-1" />
    </div>
  );
}

function PracticeScreen() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();

  const [fullscreen, setFullscreen] = useState(false);

  // ── State ───────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(
    () => searchParams.get("question")
  );
  const [sql, setSql] = useState("SELECT * FROM employees LIMIT 10;");
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);

  const [leftPane, setLeftPane] = useState<"list" | "problem">(
    () => (searchParams.get("question") ? "problem" : "list")
  );
  const [leftTab, setLeftTab] = useState<LeftTab>("description");
  const [resultsTab, setResultsTab] = useState<ResultsTab>("output");
  const [resultsCollapsed, setResultsCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState<"problem" | "editor">("problem");

  const [searchQuery, setSearchQuery] = useState(() => searchParams.get("search") ?? "");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    () => searchParams.get("category") ?? ""
  );
  const [companyFilter, setCompanyFilter] = useState<string>(
    () => searchParams.get("company") ?? ""
  );
  const [page, setPage] = useState(1);
  const { sort, toggle: toggleSort, sortedFor } = useSort<"status" | "title" | "difficulty">();

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: questionsData, isLoading: questionsLoading } = useQuery({
    queryKey: ["questions", page, difficultyFilter, searchQuery, categoryFilter, companyFilter],
    queryFn: () =>
      questionsApi.list({
        page,
        per_page: 20,
        difficulty: difficultyFilter || undefined,
        search: searchQuery || undefined,
        category_id: categoryFilter || undefined,
        company: companyFilter || undefined,
      }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const { data: question, isLoading: questionLoading, isError: questionError } = useQuery({
    queryKey: ["question", selectedId],
    queryFn: () => questionsApi.get(selectedId!),
    enabled: !!selectedId,
    retry: false,
  });

  // A stale question id (e.g. an old bookmarked URL) 404s — clear it and show
  // the list rather than wedging on a missing problem.
  useEffect(() => {
    if (selectedId && questionError) {
      setSelectedId(null);
      setLeftPane("list");
      const params = new URLSearchParams(window.location.search);
      params.delete("question");
      const qs = params.toString();
      window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
    }
  }, [selectedId, questionError]);

  const executeMutation = useMutation({
    mutationFn: (data: { sql: string; question_id: string }) => sqlApi.execute(data),
    onSuccess: (data) => {
      setResult(data);
      setSubmitResult(null);
      setResultsTab("output");
      setResultsCollapsed(false);
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: { sql: string; question_id: string }) => sqlApi.submit(data),
    onSuccess: (data) => {
      setSubmitResult(data);
      setResult({
        columns: data.actual_columns,
        rows: data.actual_rows,
        execution_time_ms: data.execution_time_ms,
        error: data.error,
        row_count: data.actual_rows.length,
      });
      setResultsTab("output");
      setResultsCollapsed(false);
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["question", selectedId] });
    },
  });

  const bookmarkMutation = useMutation({
    mutationFn: (questionId: string) => bookmarksApi.toggle(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["question", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["questions"] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleRun = useCallback(() => {
    if (!selectedId || !sql.trim()) return;
    executeMutation.mutate({ sql: sql.trim(), question_id: selectedId });
  }, [selectedId, sql, executeMutation]);

  const handleSubmit = () => {
    if (!selectedId || !sql.trim()) return;
    const payload = { sql: sql.trim(), question_id: selectedId };
    if (!isAuthenticated) {
      openAuth({
        mode: "login",
        title: "Sign in to submit",
        description: "Submitting checks your answer, saves it, and earns XP. Sign in to continue.",
        onSuccess: () => submitMutation.mutate(payload),
      });
      return;
    }
    submitMutation.mutate(payload);
  };

  const handleBookmark = () => {
    if (!question) return;
    if (!isAuthenticated) {
      openAuth({
        mode: "login",
        title: "Sign in to bookmark",
        description: "Save problems to revisit them later. Sign in to continue.",
        onSuccess: () => bookmarkMutation.mutate(question.id),
      });
      return;
    }
    bookmarkMutation.mutate(question.id);
  };

  const handleReset = () => {
    setSql("");
    setResult(null);
    setSubmitResult(null);
  };

  // Esc exits the full-screen editor.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const selectQuestion = (q: Pick<QuestionListItem, "id">) => {
    setSelectedId(q.id);
    setSql("");
    setResult(null);
    setSubmitResult(null);
    setLeftPane("problem");
    setLeftTab("description");
    setResultsTab("output");
    setMobileView("editor");
    const params = new URLSearchParams(window.location.search);
    params.set("question", q.id);
    window.history.replaceState(null, "", `?${params.toString()}`);
  };

  // Reset to first page whenever a filter changes.
  useEffect(() => setPage(1), [searchQuery, difficultyFilter, categoryFilter, companyFilter]);

  const companyParam = searchParams.get("company");
  useEffect(() => {
    if (companyParam !== null) {
      setCompanyFilter(companyParam);
      setLeftPane("list");
      setMobileView("problem");
    }
  }, [companyParam]);

  // Follow URL changes made while this screen is mounted (top-bar search,
  // bookmark links, category links).
  const searchParam = searchParams.get("search");
  const questionParam = searchParams.get("question");
  const categoryParam = searchParams.get("category");
  useEffect(() => {
    if (searchParam !== null) {
      setSearchQuery(searchParam);
      setLeftPane("list");
      setMobileView("problem");
    }
  }, [searchParam]);
  useEffect(() => {
    if (categoryParam !== null) {
      setCategoryFilter(categoryParam);
      setLeftPane("list");
    }
  }, [categoryParam]);
  useEffect(() => {
    if (questionParam && questionParam !== selectedId) selectQuestion({ id: questionParam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionParam]);

  const items = useMemo(() => {
    const list = questionsData?.items ?? [];
    if (!sort) return list;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sort.key === "title") return a.title.localeCompare(b.title) * dir;
      if (sort.key === "difficulty")
        return (DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]) * dir;
      return (Number(b.is_solved) - Number(a.is_solved)) * dir;
    });
  }, [questionsData, sort]);

  const isRunning = executeMutation.isPending || submitMutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100dvh-3rem)] flex-col lg:h-[calc(100dvh-3.5rem)]">
      {/* Mobile pane switch */}
      <div className="flex h-11 shrink-0 items-center border-b border-line bg-surface px-3 md:hidden">
        <Tabs
          variant="segmented"
          size="sm"
          aria-label="Pane"
          value={mobileView}
          onChange={setMobileView}
          items={[
            { id: "problem", label: "Problem" },
            { id: "editor", label: "Editor" },
          ]}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ── Left pane: problem list / problem detail ─────────────────── */}
        <aside
          className={cn(
            "min-h-0 shrink-0 flex-col border-r border-line bg-surface md:flex md:w-[380px] xl:w-[420px]",
            mobileView === "problem" ? "flex w-full" : "hidden"
          )}
          aria-label="Problem"
        >
          {leftPane === "list" || !selectedId ? (
            <ProblemList
              items={items}
              loading={questionsLoading}
              selectedId={selectedId}
              onSelect={selectQuestion}
              onBack={selectedId ? () => setLeftPane("problem") : undefined}
              search={searchQuery}
              onSearch={setSearchQuery}
              difficulty={difficultyFilter}
              onDifficulty={setDifficultyFilter}
              category={categoryFilter}
              onCategory={setCategoryFilter}
              company={companyFilter}
              onClearCompany={() => setCompanyFilter("")}
              categories={categories?.map((c) => ({ id: c.id, name: c.name })) ?? []}
              page={page}
              totalPages={questionsData?.total_pages ?? 1}
              total={questionsData?.total}
              onPage={setPage}
              sortedFor={sortedFor}
              onSort={toggleSort}
            />
          ) : (
            <ProblemDetail
              question={question}
              loading={questionLoading}
              tab={leftTab}
              onTab={setLeftTab}
              onShowList={() => setLeftPane("list")}
              onToggleBookmark={handleBookmark}
              bookmarkPending={bookmarkMutation.isPending}
            />
          )}
        </aside>

        {/* ── Right pane: editor + results ─────────────────────────────── */}
        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col bg-surface md:flex",
            mobileView === "editor" ? "flex" : "hidden",
            fullscreen && "fixed inset-0 z-50 flex h-dvh w-screen"
          )}
          aria-label="Editor"
        >
          {!selectedId ? (
            <EmptyState
              icon={Code2}
              title="Select a problem"
              description="Pick a problem from the list to open the editor. Your query runs against a sandboxed copy of the problem's database."
              className="h-full"
            />
          ) : (
            <>
              {/* Toolbar — file tab left, actions right */}
              <div className="flex h-11 shrink-0 items-stretch justify-between gap-3 border-b border-line bg-surface pr-2">
                <div className="flex min-w-0 items-stretch">
                  <span className="relative flex items-center gap-2 border-r border-line bg-[var(--editor-bg)] px-4 font-mono text-xs text-fg">
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        submitResult?.is_correct ? "bg-success" : sql.trim() ? "bg-accent-text" : "bg-line-strong"
                      )}
                      aria-hidden
                    />
                    query.sql
                    <span className="absolute inset-x-0 -bottom-px h-px bg-[var(--editor-bg)]" aria-hidden />
                  </span>
                  {question && (
                    <span className="hidden min-w-0 items-center truncate px-4 text-xs text-fg-subtle xl:flex">
                      {question.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="mr-2 hidden items-center gap-1 text-xs text-fg-faint lg:flex">
                    <Kbd>Ctrl</Kbd>
                    <Kbd>↵</Kbd>
                    <span className="ml-1">run</span>
                  </div>
                  <Tooltip label="Clear editor">
                    <Button variant="ghost" size="icon-sm" onClick={handleReset} disabled={isRunning} aria-label="Reset">
                      <RotateCcw />
                    </Button>
                  </Tooltip>
                  <Tooltip label={fullscreen ? "Exit full screen (Esc)" : "Full screen"}>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setFullscreen((f) => !f)}
                      aria-label={fullscreen ? "Exit full screen" : "Full screen"}
                      aria-pressed={fullscreen}
                    >
                      {fullscreen ? <Minimize2 /> : <Maximize2 />}
                    </Button>
                  </Tooltip>
                  <span className="mx-1 h-5 w-px bg-line" aria-hidden />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRun}
                    loading={executeMutation.isPending}
                    disabled={isRunning || !sql.trim()}
                  >
                    {!executeMutation.isPending && <Play />}
                    Run
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSubmit}
                    loading={submitMutation.isPending}
                    disabled={isRunning || !sql.trim()}
                  >
                    {!submitMutation.isPending && <Send />}
                    Submit
                  </Button>
                </div>
              </div>

              {/* Editor */}
              <div className="min-h-0 flex-1 bg-[var(--editor-bg)]">
                <SQLEditor value={sql} onChange={setSql} onRun={handleRun} height="100%" />
              </div>

              {/* Results */}
              <div
                className={cn(
                  "flex shrink-0 flex-col border-t border-line bg-surface transition-[height] duration-200 ease-out",
                  resultsCollapsed ? "h-9" : "h-[42%] min-h-[180px]"
                )}
              >
                <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-b border-line pl-2 pr-2">
                  <Tabs
                    size="sm"
                    aria-label="Results"
                    value={resultsTab}
                    onChange={(t) => {
                      setResultsTab(t);
                      setResultsCollapsed(false);
                    }}
                    className="h-9 border-b-0"
                    items={[
                      { id: "output", label: "Output" },
                      { id: "expected", label: "Expected", disabled: !submitResult },
                    ]}
                  />
                  <div className="flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {submitResult && (
                        <motion.div key={submitResult.is_correct ? "ok" : "no"} {...fade} transition={quick}>
                          {submitResult.is_correct ? (
                            <Badge tone="success">
                              <CheckCircle2 className="size-3" aria-hidden />
                              Correct
                              {submitResult.xp_earned > 0 && ` · +${submitResult.xp_earned} XP`}
                            </Badge>
                          ) : (
                            <Badge tone="danger">
                              <XCircle className="size-3" aria-hidden />
                              Incorrect
                            </Badge>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setResultsCollapsed((c) => !c)}
                      aria-label={resultsCollapsed ? "Expand results" : "Collapse results"}
                      aria-expanded={!resultsCollapsed}
                    >
                      {resultsCollapsed ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                  </div>
                </div>

                {!resultsCollapsed && (
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {submitResult && !submitResult.is_correct && (submitResult.message || submitResult.error) && (
                      <div
                        role="status"
                        className="border-b border-line bg-danger-bg px-3 py-2 text-xs text-fg-muted"
                      >
                        {submitResult.message || submitResult.error}
                      </div>
                    )}
                    {submitResult && submitResult.is_correct && submitResult.message && (
                      <div
                        role="status"
                        className="border-b border-line bg-success-bg px-3 py-2 text-xs text-fg-muted"
                      >
                        {submitResult.message}
                      </div>
                    )}
                    {resultsTab === "output" ? (
                      <ResultTable
                        columns={result?.columns ?? []}
                        rows={result?.rows ?? []}
                        executionTime={result?.execution_time_ms}
                        error={result?.error}
                        emptyDescription="Run a query to see its output. Submit to compare against the expected result."
                      />
                    ) : (
                      <ResultTable
                        columns={submitResult?.expected_columns ?? []}
                        rows={submitResult?.expected_rows ?? []}
                        emptyTitle="No expected output"
                        emptyDescription="Submit a query to see the expected result."
                      />
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function ProblemList({
  items,
  loading,
  selectedId,
  onSelect,
  onBack,
  search,
  onSearch,
  difficulty,
  onDifficulty,
  category,
  onCategory,
  company,
  onClearCompany,
  categories,
  page,
  totalPages,
  total,
  onPage,
  sortedFor,
  onSort,
}: {
  items: QuestionListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (q: QuestionListItem) => void;
  onBack?: () => void;
  search: string;
  onSearch: (v: string) => void;
  difficulty: string;
  onDifficulty: (v: string) => void;
  category: string;
  onCategory: (v: string) => void;
  company: string;
  onClearCompany: () => void;
  categories: { id: string; name: string }[];
  page: number;
  totalPages: number;
  total?: number;
  onPage: (p: number) => void;
  sortedFor: (k: "status" | "title" | "difficulty") => "asc" | "desc" | false;
  onSort: (k: "status" | "title" | "difficulty") => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-4">
        <h2 className="flex items-baseline gap-2">
          <span className="eyebrow text-fg">Problems</span>
          {total !== undefined && (
            <span className="font-mono text-2xs text-fg-faint tabular-nums">{total.toLocaleString()}</span>
          )}
        </h2>
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            Back to problem
          </Button>
        )}
      </div>

      <div className="space-y-2.5 border-b border-line bg-surface-2/40 p-3">
        <Input
          type="search"
          placeholder="Search problems"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          leadingIcon={<Search />}
          aria-label="Search problems"
        />
        <div className="flex items-center gap-2">
          <Tabs
            variant="segmented"
            size="sm"
            aria-label="Difficulty"
            value={(difficulty || "all") as "all" | Difficulty}
            onChange={(v) => onDifficulty(v === "all" ? "" : v)}
            items={[
              { id: "all", label: "All" },
              { id: "Easy", label: "Easy" },
              { id: "Medium", label: "Medium" },
              { id: "Hard", label: "Hard" },
            ]}
          />
          <Select
            value={category}
            onChange={(e) => onCategory(e.target.value)}
            aria-label="Category"
            className="h-7 text-xs"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        {company && (
          <div className="flex items-center gap-2 pt-0.5">
            <span className="text-xs text-fg-subtle">Company</span>
            <span className="inline-flex h-6 items-center gap-1 rounded-sm border border-accent-line bg-accent-subtle pl-2 pr-1 text-xs font-medium text-accent-text">
              {company}
              <button
                type="button"
                onClick={onClearCompany}
                aria-label="Clear company filter"
                className="inline-flex size-4 items-center justify-center rounded-sm hover:bg-accent-line/40"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr>
              <TableHeaderCell
                className="w-10 px-2"
                align="center"
                sortable
                sorted={sortedFor("status")}
                onSort={() => onSort("status")}
              >
                <span className="sr-only">Status</span>
                <CheckCircle2 className="size-3.5" aria-hidden />
              </TableHeaderCell>
              <TableHeaderCell sortable sorted={sortedFor("title")} onSort={() => onSort("title")}>
                Title
              </TableHeaderCell>
              <TableHeaderCell
                className="w-24 px-2"
                sortable
                sorted={sortedFor("difficulty")}
                onSort={() => onSort("difficulty")}
              >
                Difficulty
              </TableHeaderCell>
              <TableHeaderCell className="w-9 px-2">
                <span className="sr-only">Bookmarked</span>
              </TableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows rows={10} columns={4} />
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState
                    compact
                    icon={Search}
                    title="No problems match"
                    description="Try a different search or clear the filters."
                  />
                </td>
              </tr>
            ) : (
              items.map((q) => {
                const selected = q.id === selectedId;
                return (
                  <tr
                    key={q.id}
                    onClick={() => onSelect(q)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(q);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-current={selected ? "true" : undefined}
                    className={cn(
                      "group cursor-pointer border-b border-line transition-colors duration-150 last:border-b-0 hover:bg-surface-2/70",
                      selected &&
                        "bg-accent-subtle shadow-[inset_2px_0_0_var(--accent-text)] hover:bg-accent-subtle"
                    )}
                  >
                    <td className="px-2 py-2.5 text-center">
                      {q.is_solved ? (
                        <Check className="mx-auto size-4 text-success" aria-label="Solved" />
                      ) : (
                        <Circle className="mx-auto size-3.5 text-fg-faint" strokeWidth={1.5} aria-label="Unsolved" />
                      )}
                    </td>
                    <td className="max-w-0 px-3 py-2.5">
                      <p className="truncate text-sm font-medium text-fg">{q.title}</p>
                      <p className="mt-0.5 truncate font-mono text-2xs text-fg-faint">{q.category_name}</p>
                    </td>
                    <td className="px-2 py-2.5">
                      <DifficultyBadge difficulty={q.difficulty} />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {q.is_bookmarked && (
                        <Bookmark className="mx-auto size-3.5 fill-current text-accent-text" aria-label="Bookmarked" />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="shrink-0 border-t border-line px-3 py-2">
        <Pagination page={page} totalPages={totalPages} total={total} label="problems" onChange={onPage} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function ProblemDetail({
  question,
  loading,
  tab,
  onTab,
  onShowList,
  onToggleBookmark,
  bookmarkPending,
}: {
  question: QuestionDetail | undefined;
  loading: boolean;
  tab: LeftTab;
  onTab: (t: LeftTab) => void;
  onShowList: () => void;
  onToggleBookmark: () => void;
  bookmarkPending: boolean;
}) {
  const tabs = useMemo(() => {
    const t: { id: LeftTab; label: string }[] = [
      { id: "description", label: "Description" },
      { id: "schema", label: "Schema" },
    ];
    if (question?.hint) t.push({ id: "hint", label: "Hint" });
    t.push({ id: "solution", label: "Solution" });
    return t;
  }, [question]);

  // If the active tab disappears (new question without a hint), fall back.
  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) onTab("description");
  }, [tabs, tab, onTab]);

  // Hint and solution are both revealed on demand.
  const [hintRevealed, setHintRevealed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  useEffect(() => {
    setRevealed(false);
    setHintRevealed(false);
  }, [question?.id]);
  const { data: solutionData, isFetching: solutionLoading } = useQuery({
    queryKey: ["solution", question?.id],
    queryFn: () => questionsApi.solution(question!.id),
    enabled: revealed && !!question?.id,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-line pl-2 pr-2">
        <Tooltip label="All problems">
          <Button variant="ghost" size="icon" onClick={onShowList} aria-label="All problems">
            <List />
          </Button>
        </Tooltip>
        {loading || !question ? (
          <Skeleton className="h-4 w-40" />
        ) : (
          <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-fg">{question.title}</h2>
        )}
        {question && (
          <Tooltip label={question.is_bookmarked ? "Remove bookmark" : "Bookmark"}>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleBookmark}
              disabled={bookmarkPending}
              aria-pressed={question.is_bookmarked}
              aria-label={question.is_bookmarked ? "Remove bookmark" : "Bookmark"}
            >
              {question.is_bookmarked ? <BookmarkCheck className="text-accent-text" /> : <Bookmark />}
            </Button>
          </Tooltip>
        )}
        {question && (
          <Tooltip label="Report an issue">
            <Button variant="ghost" size="icon" onClick={() => setReportOpen(true)} aria-label="Report an issue">
              <Flag />
            </Button>
          </Tooltip>
        )}
      </div>

      {question && (
        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          questionId={question.id}
          questionTitle={question.title}
        />
      )}

      <Tabs size="sm" aria-label="Problem sections" value={tab} onChange={onTab} items={tabs} className="px-3" />

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading || !question ? (
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ) : tab === "description" ? (
          <div className="space-y-4 px-5 py-5">
            <h1 className="font-display text-[1.75rem] leading-[2rem] tracking-[-0.01em] text-fg">
              {question.title}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5">
              <DifficultyBadge difficulty={question.difficulty} />
              {question.category_name && <Badge tone="neutral">{question.category_name}</Badge>}
              {question.is_solved && (
                <Badge tone="success">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Solved
                </Badge>
              )}
            </div>
            <FormattedDescription text={question.description} />
            {question.companies && (
              <div className="space-y-2 border-t border-line pt-4">
                <p className="eyebrow">Asked at</p>
                <div className="flex flex-wrap gap-1.5">
                  {question.companies
                    .split(",")
                    .map((c) => c.trim())
                    .filter(Boolean)
                    .map((c) => (
                      <CompanyChip key={c} name={c} />
                    ))}
                </div>
              </div>
            )}
            {question.tags && (
              <div className="flex flex-wrap gap-1 pt-1">
                {question.tags.split(",").map((tag) => (
                  <Badge key={tag.trim()} tone="outline">
                    {tag.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : tab === "schema" ? (
          <div className="p-4">
            <SchemaView sql={question.schema_sql} sampleSql={question.sample_data_sql} />
          </div>
        ) : tab === "hint" ? (
          <div className="p-4">
            {!hintRevealed ? (
              <EmptyState
                icon={Lightbulb}
                title="Need a nudge?"
                description="Give the problem a genuine try first. Reveal a hint only if you're stuck."
                action={
                  <Button variant="secondary" size="sm" onClick={() => setHintRevealed(true)}>
                    <Eye />
                    Show hint
                  </Button>
                }
              />
            ) : (
              <div className="flex gap-2.5 rounded-md border border-warning-line bg-warning-bg px-3 py-2.5 text-sm leading-6 text-fg">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
                <span>{question.hint}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {!revealed ? (
              <EmptyState
                icon={Lightbulb}
                title="Reveal the solution"
                description="Try it yourself first. When you're ready, view a reference solution that produces the expected output."
                action={
                  <Button variant="secondary" size="sm" onClick={() => setRevealed(true)}>
                    <Eye />
                    View solution
                  </Button>
                }
              />
            ) : solutionLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (solutionData?.solutions ?? []).length > 0 ? (
              <div className="space-y-4">
                {(solutionData?.solutions ?? []).map((sol, i) => (
                  <SolutionBlock
                    key={i}
                    label={
                      (solutionData?.solutions.length ?? 1) > 1
                        ? `Solution ${i + 1}`
                        : "Reference solution"
                    }
                    code={sol}
                  />
                ))}
              </div>
            ) : (
              <EmptyState icon={Code2} title="No solution available" compact />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const DESC_HEADINGS = new Set(["Scenario", "Task", "Requirements", "Expected output"]);

/** Render the structured problem description: section headings, paragraphs, bullets. */
function FormattedDescription({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      blocks.push(
        <ul key={key} className="list-disc space-y-1 pl-5 text-sm leading-6 text-fg-muted marker:text-fg-faint">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };
  lines.forEach((ln, i) => {
    const t = ln.trim();
    if (!t) {
      flush(`u${i}`);
      return;
    }
    if (DESC_HEADINGS.has(t)) {
      flush(`u${i}`);
      blocks.push(
        <p key={`h${i}`} className="eyebrow pt-2 first:pt-0">
          {t}
        </p>
      );
      return;
    }
    if (t.startsWith("- ")) {
      bullets.push(t.slice(2));
      return;
    }
    flush(`u${i}`);
    blocks.push(
      <p key={`p${i}`} className="text-sm leading-6 text-fg">
        {t}
      </p>
    );
  });
  flush("uend");
  return <div className="space-y-2">{blocks}</div>;
}

function SolutionBlock({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="overflow-hidden rounded-md border border-line">
      <div className="flex h-8 items-center justify-between border-b border-line bg-surface-2 pl-3 pr-1.5">
        <span className="text-xs font-medium text-fg-muted">{label}</span>
        <Button variant="ghost" size="sm" onClick={copy}>
          {copied ? <Check className="text-success" /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-fg">{code}</pre>
    </div>
  );
}
