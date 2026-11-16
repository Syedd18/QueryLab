"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Pencil, Trash2, Search, FileQuestion, Inbox } from "lucide-react";
import { questionsApi, categoriesApi, reportsApi } from "@/lib/api";
import type { QuestionCreateData, QuestionListItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Page, PageHeader } from "@/components/ui/page";
import { Card, CardHeader, CardTitle, CardBody, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Tooltip } from "@/components/ui/tooltip";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { expand, normal } from "@/lib/motion";
import { formatRelativeTime } from "@/lib/utils";

const emptyForm: QuestionCreateData = {
  title: "",
  description: "",
  difficulty: "Easy",
  category_id: "",
  schema_sql: "",
  expected_query: "",
  hint: "",
  tags: "",
  companies: "",
};

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<"problems" | "reports">("problems");

  // Admin panel is restricted to admins. Non-admins are sent to the dashboard.
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user?.is_admin)) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, user, router]);

  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<QuestionListItem | null>(null);
  const [form, setForm] = useState<QuestionCreateData>(emptyForm);

  const { data: questions, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-questions", page, searchQuery],
    queryFn: () => questionsApi.list({ page, per_page: 20, search: searchQuery || undefined }),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: categoriesApi.list,
  });

  const closeForm = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const createMutation = useMutation({
    mutationFn: (data: QuestionCreateData) => questionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      closeForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuestionCreateData> }) =>
      questionsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      closeForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => questionsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-questions"] });
      setPendingDelete(null);
    },
  });

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const startEdit = (q: QuestionListItem) => {
    setEditingId(q.id);
    setShowCreateForm(false);
    questionsApi.get(q.id).then((detail) => {
      setForm({
        title: detail.title,
        description: detail.description,
        difficulty: detail.difficulty,
        category_id: detail.category_id,
        schema_sql: detail.schema_sql,
        expected_query: detail.expected_query || "",
        hint: detail.hint || "",
        tags: detail.tags || "",
        companies: detail.companies || "",
      });
    });
  };

  const formOpen = showCreateForm || !!editingId;
  const saving = createMutation.isPending || updateMutation.isPending;
  const saveError = createMutation.error ?? updateMutation.error;

  if (authLoading) {
    return (
      <Page width="wide">
        <Skeleton className="h-8 w-40" />
      </Page>
    );
  }
  if (!isAuthenticated || !user?.is_admin) return null;

  return (
    <Page width="wide">
      <PageHeader
        title="Admin"
        description="Manage the problem library and review reported issues."
        actions={
          <div className="flex items-center gap-2">
            <Tabs
              variant="segmented"
              aria-label="Admin section"
              value={view}
              onChange={setView}
              items={[
                { id: "problems", label: "Problems" },
                { id: "reports", label: "Reports" },
              ]}
            />
            {view === "problems" && (
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  if (formOpen) closeForm();
                  else setShowCreateForm(true);
                }}
                aria-expanded={formOpen}
              >
                <Plus />
                New problem
              </Button>
            )}
          </div>
        }
      />

      {view === "reports" ? (
        <ReportsSection />
      ) : (
        <>
      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.div key="form" {...expand} transition={normal} className="overflow-hidden">
            <Card className="mb-6">
              <form onSubmit={handleSubmitForm}>
                <CardHeader>
                  <CardTitle>{editingId ? "Edit problem" : "New problem"}</CardTitle>
                </CardHeader>
                <CardBody className="space-y-4">
                  {saveError && (
                    <ErrorState
                      title="Couldn't save"
                      description={saveError instanceof Error ? saveError.message : undefined}
                    />
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Title" htmlFor="q-title">
                      <Input
                        id="q-title"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        required
                        placeholder="e.g. Second highest salary"
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Difficulty" htmlFor="q-difficulty">
                        <Select
                          id="q-difficulty"
                          value={form.difficulty}
                          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </Select>
                      </Field>
                      <Field label="Category" htmlFor="q-category">
                        <Select
                          id="q-category"
                          value={form.category_id}
                          onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                          required
                        >
                          <option value="">Select</option>
                          {(categories ?? []).map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                  </div>

                  <Field label="Description" htmlFor="q-description">
                    <Textarea
                      id="q-description"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      required
                      rows={3}
                      placeholder="What should the query return?"
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Schema SQL" htmlFor="q-schema">
                      <Textarea
                        id="q-schema"
                        mono
                        value={form.schema_sql}
                        onChange={(e) => setForm({ ...form, schema_sql: e.target.value })}
                        required
                        rows={6}
                        placeholder="CREATE TABLE ..."
                      />
                    </Field>
                    <Field label="Expected query" htmlFor="q-expected">
                      <Textarea
                        id="q-expected"
                        mono
                        value={form.expected_query}
                        onChange={(e) => setForm({ ...form, expected_query: e.target.value })}
                        required
                        rows={6}
                        placeholder="SELECT ..."
                      />
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Hint" htmlFor="q-hint" hint="Optional">
                      <Input
                        id="q-hint"
                        value={form.hint || ""}
                        onChange={(e) => setForm({ ...form, hint: e.target.value })}
                      />
                    </Field>
                    <Field label="Tags" htmlFor="q-tags" hint="Comma separated">
                      <Input
                        id="q-tags"
                        value={form.tags || ""}
                        onChange={(e) => setForm({ ...form, tags: e.target.value })}
                        placeholder="joins, aggregation"
                      />
                    </Field>
                  </div>

                  <Field label="Companies" htmlFor="q-companies" hint="Comma separated — companies that ask this problem">
                    <Input
                      id="q-companies"
                      value={form.companies || ""}
                      onChange={(e) => setForm({ ...form, companies: e.target.value })}
                      placeholder="Amazon, Meta, Stripe"
                    />
                  </Field>
                </CardBody>
                <CardFooter className="justify-end">
                  <Button variant="ghost" onClick={closeForm} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" loading={saving}>
                    {editingId ? "Save changes" : "Create problem"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {isError && (
        <ErrorState
          className="mb-4"
          title="Couldn't load problems"
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line p-3">
          <Input
            type="search"
            placeholder="Search problems"
            aria-label="Search problems"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            leadingIcon={<Search />}
            className="max-w-sm"
          />
          {questions && (
            <span className="ml-auto text-xs text-fg-subtle tabular-nums">
              {questions.total.toLocaleString()} total
            </span>
          )}
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell className="w-48">Category</TableHeaderCell>
              <TableHeaderCell className="w-28">Difficulty</TableHeaderCell>
              <TableHeaderCell className="w-24" align="right">
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={8} columns={4} />
            ) : (questions?.items ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={FileQuestion}
                    title={searchQuery ? "No problems match" : "No problems yet"}
                    description={searchQuery ? "Try a different search." : "Create the first problem to get started."}
                  />
                </TableCell>
              </TableRow>
            ) : (
              (questions?.items ?? []).map((q) => (
                <TableRow key={q.id} selected={editingId === q.id}>
                  <TableCell className="max-w-0 truncate font-medium">{q.title}</TableCell>
                  <TableCell className="text-fg-muted">{q.category_name}</TableCell>
                  <TableCell>
                    <DifficultyBadge difficulty={q.difficulty} />
                  </TableCell>
                  <TableCell align="right" className="py-1">
                    <div className="inline-flex items-center gap-0.5">
                      <Tooltip label="Edit">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => startEdit(q)}
                          aria-label={`Edit ${q.title}`}
                        >
                          <Pencil />
                        </Button>
                      </Tooltip>
                      <Tooltip label="Delete">
                        <Button
                          variant="destructive-ghost"
                          size="icon-sm"
                          onClick={() => setPendingDelete(q)}
                          aria-label={`Delete ${q.title}`}
                        >
                          <Trash2 />
                        </Button>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {questions && questions.total_pages > 1 && (
          <CardFooter>
            <Pagination
              page={page}
              totalPages={questions.total_pages}
              total={questions.total}
              label="problems"
              onChange={setPage}
              className="w-full"
            />
          </CardFooter>
        )}
      </Card>
        </>
      )}

      <Dialog
        open={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        title="Delete problem"
        description="This permanently removes the problem and its submissions. This can't be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)} disabled={deleteMutation.isPending}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-fg-muted">
          You are about to delete <span className="font-medium text-fg">{pendingDelete?.title}</span>.
        </p>
        {deleteMutation.isError && (
          <ErrorState
            className="mt-3"
            title="Couldn't delete"
            description={deleteMutation.error instanceof Error ? deleteMutation.error.message : undefined}
          />
        )}
      </Dialog>
    </Page>
  );
}

function ReportsSection() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const { data: reports, isLoading, isError, refetch } = useQuery({
    queryKey: ["reports", filter],
    queryFn: () => reportsApi.list(filter === "all" ? undefined : filter),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "open" | "resolved" }) =>
      reportsApi.updateStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reports"] }),
  });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line p-3">
        <Tabs
          variant="segmented"
          size="sm"
          aria-label="Report status"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "open", label: "Open" },
            { id: "resolved", label: "Resolved" },
            { id: "all", label: "All" },
          ]}
        />
        <span className="ml-auto text-xs text-fg-subtle tabular-nums">
          {reports?.length ?? 0} shown
        </span>
      </div>

      {isError && (
        <div className="p-4">
          <ErrorState
            title="Couldn't load reports"
            action={
              <Button variant="secondary" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            }
          />
        </div>
      )}

      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell className="w-44">Problem</TableHeaderCell>
            <TableHeaderCell className="w-44">Category</TableHeaderCell>
            <TableHeaderCell>Message</TableHeaderCell>
            <TableHeaderCell className="w-28">Reporter</TableHeaderCell>
            <TableHeaderCell className="w-24">When</TableHeaderCell>
            <TableHeaderCell className="w-28" align="right">
              Status
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <SkeletonRows rows={6} columns={6} />
          ) : (reports ?? []).length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="p-0">
                <EmptyState icon={Inbox} title="No reports" description="Nothing to review here." />
              </TableCell>
            </TableRow>
          ) : (
            (reports ?? []).map((r) => (
              <TableRow key={r.id}>
                <TableCell className="max-w-0 truncate font-medium">{r.question_title ?? "—"}</TableCell>
                <TableCell className="text-fg-muted">{r.category}</TableCell>
                <TableCell className="max-w-0">
                  <p className="truncate text-fg" title={r.message}>
                    {r.message}
                  </p>
                </TableCell>
                <TableCell className="text-fg-muted">{r.user_name ?? "Guest"}</TableCell>
                <TableCell className="text-fg-subtle">{formatRelativeTime(r.created_at)}</TableCell>
                <TableCell align="right" className="py-1">
                  {r.status === "open" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={update.isPending && update.variables?.id === r.id}
                      onClick={() => update.mutate({ id: r.id, status: "resolved" })}
                    >
                      Resolve
                    </Button>
                  ) : (
                    <div className="inline-flex items-center gap-2">
                      <Badge tone="success">Resolved</Badge>
                      <Button variant="ghost" size="sm" onClick={() => update.mutate({ id: r.id, status: "open" })}>
                        Reopen
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
