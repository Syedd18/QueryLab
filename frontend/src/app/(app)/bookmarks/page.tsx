"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Trash2 } from "lucide-react";
import { bookmarksApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { DifficultyBadge } from "@/components/difficulty-badge";
import { Page, PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { formatRelativeTime } from "@/lib/utils";

export default function BookmarksPage() {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();
  const { data: bookmarks, isLoading, isError, refetch } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: bookmarksApi.list,
    enabled: isAuthenticated,
  });

  // Declared before any early return so hook order never changes between renders.
  const removeMutation = useMutation({
    mutationFn: (questionId: string) => bookmarksApi.remove(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
    },
  });

  if (!isAuthenticated) {
    return (
      <Page>
        <PageHeader eyebrow="My activity" title="Bookmarks" description="Save problems to revisit them later." />
        <Card className="overflow-hidden">
          <EmptyState
            icon={Bookmark}
            title="Sign in to use bookmarks"
            description="Create a free account to save problems and find them here anytime."
            action={
              <div className="flex gap-2">
                <Button variant="primary" size="sm" onClick={() => openAuth({ mode: "signup" })}>
                  Create account
                </Button>
                <Button variant="secondary" size="sm" onClick={() => openAuth({ mode: "login" })}>
                  Sign in
                </Button>
              </div>
            }
          />
        </Card>
      </Page>
    );
  }

  const list = bookmarks ?? [];

  return (
    <Page>
      <PageHeader
        eyebrow="My activity"
        title="Bookmarks"
        description={
          isLoading ? "Problems you saved for later." : `${list.length} saved ${list.length === 1 ? "problem" : "problems"}.`
        }
      />

      {isError && (
        <ErrorState
          className="mb-6"
          title="Couldn't load bookmarks"
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Problem</TableHeaderCell>
              <TableHeaderCell className="w-28">Difficulty</TableHeaderCell>
              <TableHeaderCell className="w-32">Saved</TableHeaderCell>
              <TableHeaderCell className="w-12">
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={5} columns={4} />
            ) : list.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={Bookmark}
                    title="No bookmarks"
                    description="Use the bookmark button on a problem to save it here for later."
                    action={
                      <LinkButton href="/practice" variant="secondary" size="sm">
                        Browse problems
                      </LinkButton>
                    }
                  />
                </TableCell>
              </TableRow>
            ) : (
              list.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="max-w-0 truncate">
                    <Link
                      href={`/practice?question=${b.question_id}`}
                      className="font-medium text-fg hover:underline"
                    >
                      {b.question_title || "Untitled"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {b.question_difficulty && <DifficultyBadge difficulty={b.question_difficulty} />}
                  </TableCell>
                  <TableCell className="text-fg-subtle">{formatRelativeTime(b.created_at)}</TableCell>
                  <TableCell align="right" className="py-1">
                    <Tooltip label="Remove bookmark">
                      <Button
                        variant="destructive-ghost"
                        size="icon-sm"
                        onClick={() => removeMutation.mutate(b.question_id)}
                        disabled={removeMutation.isPending}
                        aria-label={`Remove bookmark for ${b.question_title || "problem"}`}
                      >
                        <Trash2 />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Page>
  );
}
