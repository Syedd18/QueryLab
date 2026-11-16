"use client";

import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Medal, Flame, CheckCircle2, Sparkles } from "lucide-react";
import { leaderboardApi } from "@/lib/api";
import type { LeaderboardData } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { Page, PageHeader } from "@/components/ui/page";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/empty-state";
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Entry = LeaderboardData["entries"][number];

// Muted medal palette (works in both themes).
const MEDALS = [
  { ring: "ring-[#c5a36a]/45", chip: "bg-[#c5a36a] text-black", soft: "text-[#c5a36a]", Icon: Crown },
  { ring: "ring-[#a0a5aa]/45", chip: "bg-[#a0a5aa] text-black", soft: "text-[#a0a5aa]", Icon: Medal },
  { ring: "ring-[#777f87]/45", chip: "bg-[#777f87] text-white", soft: "text-[#a0a5aa]", Icon: Medal },
];

export default function LeaderboardPage() {
  const { user, isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => leaderboardApi.get(50),
  });

  const entries = data?.entries ?? [];
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const maxXp = entries[0]?.xp || 1;
  const meInList = entries.some((e) => e.user_id === user?.id);

  return (
    <Page>
      <PageHeader
        title="Leaderboard"
        description={
          data
            ? `Top ${entries.length} of ${data.total_users.toLocaleString()} practitioners, ranked by XP.`
            : "Ranked by XP."
        }
        actions={
          data?.current_user_rank ? (
            <Badge tone="accent" className="h-7 gap-1.5 px-2.5">
              <Trophy className="size-3.5" aria-hidden />
              Your rank · #{data.current_user_rank}
            </Badge>
          ) : null
        }
      />

      {isError && (
        <ErrorState
          className="mb-6"
          title="Couldn't load the leaderboard"
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      )}

      {/* Top 3 */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : top3.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          {top3.map((entry, i) => (
            <PodiumCard key={entry.user_id} entry={entry} place={i + 1} isMe={entry.user_id === user?.id} />
          ))}
        </div>
      ) : null}

      {/* The rest */}
      <Card className="mt-4 overflow-hidden">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell className="w-14" align="right">
                #
              </TableHeaderCell>
              <TableHeaderCell>User</TableHeaderCell>
              <TableHeaderCell className="w-56">XP</TableHeaderCell>
              <TableHeaderCell align="right" className="hidden w-24 sm:table-cell">
                Streak
              </TableHeaderCell>
              <TableHeaderCell align="right" className="hidden w-24 sm:table-cell">
                Solved
              </TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <SkeletonRows rows={8} columns={5} />
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={Trophy} title="No one on the board yet" description="Be the first to solve a problem and claim the top spot." />
                </TableCell>
              </TableRow>
            ) : rest.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-fg-subtle">
                  That&apos;s everyone for now.
                </TableCell>
              </TableRow>
            ) : (
              rest.map((entry) => (
                <LeaderRow key={entry.user_id} entry={entry} maxXp={maxXp} isMe={entry.user_id === user?.id} />
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Your position, if signed in but outside the visible list */}
      {isAuthenticated && data?.current_user_rank && !meInList && user && (
        <Card className="mt-3 border-accent-line">
          <CardBody className="flex items-center gap-3 py-3">
            <span className="w-10 text-right text-sm font-semibold text-accent-text tabular-nums">
              #{data.current_user_rank}
            </span>
            <Avatar name={user.name} src={user.avatar_url} size="sm" />
            <span className="flex-1 truncate text-sm font-medium text-fg">
              {user.name}
              <Badge tone="accent" className="ml-1.5">
                You
              </Badge>
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-fg tabular-nums">
              <Sparkles className="size-3.5 text-accent-text" aria-hidden />
              {user.xp.toLocaleString()} XP
            </span>
          </CardBody>
        </Card>
      )}

      {/* Guest nudge */}
      {!isAuthenticated && !isLoading && (
        <Card className="mt-3">
          <CardBody className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-sm text-fg-muted">Solve problems to earn XP and appear on the leaderboard.</p>
            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={() => openAuth({ mode: "signup" })}>
                Create account
              </Button>
              <Button variant="secondary" size="sm" onClick={() => openAuth({ mode: "login" })}>
                Sign in
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
    </Page>
  );
}

function PodiumCard({ entry, place, isMe }: { entry: Entry; place: number; isMe: boolean }) {
  const m = MEDALS[place - 1];
  const Icon = m.Icon;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4",
        place === 1 && "ring-1",
        place === 1 && m.ring,
        isMe && "bg-accent-subtle"
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-7 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            m.chip
          )}
        >
          {place}
        </span>
        <Icon className={cn("size-4", m.soft)} aria-hidden />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar name={entry.name} src={entry.avatar_url} size="lg" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-fg">
            {entry.name}
            {isMe && <Badge tone="accent">You</Badge>}
          </p>
          <p className="text-xs text-fg-subtle">Rank #{entry.rank}</p>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-xl font-semibold text-fg tabular-nums">{entry.xp.toLocaleString()}</p>
          <p className="text-2xs text-fg-subtle">XP</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-fg-subtle tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Flame className="size-3.5 text-warning" aria-hidden />
            {entry.streak}
          </span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="size-3.5 text-success" aria-hidden />
            {entry.solved_count}
          </span>
        </div>
      </div>
    </Card>
  );
}

function LeaderRow({ entry, maxXp, isMe }: { entry: Entry; maxXp: number; isMe: boolean }) {
  const pct = Math.max(2, Math.round((entry.xp / maxXp) * 100));
  return (
    <TableRow selected={isMe}>
      <TableCell align="right">
        <span className="text-sm text-fg-subtle tabular-nums">{entry.rank}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <Avatar name={entry.name} src={entry.avatar_url} size="sm" />
          <span className="truncate font-medium text-fg">{entry.name}</span>
          {isMe && <Badge tone="accent">You</Badge>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2.5">
          <span className="w-14 shrink-0 font-medium text-fg tabular-nums">{entry.xp.toLocaleString()}</span>
          <div className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3 sm:block">
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </TableCell>
      <TableCell align="right" className="hidden text-fg-muted sm:table-cell">
        <span className="inline-flex items-center justify-end gap-1 tabular-nums">
          <Flame className="size-3.5 text-warning" aria-hidden />
          {entry.streak}
        </span>
      </TableCell>
      <TableCell align="right" className="hidden text-fg-muted sm:table-cell">
        <span className="inline-flex items-center justify-end gap-1 tabular-nums">
          <CheckCircle2 className="size-3.5 text-success" aria-hidden />
          {entry.solved_count}
        </span>
      </TableCell>
    </TableRow>
  );
}
