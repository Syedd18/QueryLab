"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Play,
  Star,
  Trophy,
  Flame,
  Gem,
  Link2,
  Layers,
  Crown,
  Check,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authApi, dashboardApi } from "@/lib/api";
import { StatCard } from "@/components/stat-card";
import { Page, PageHeader } from "@/components/ui/page";
import { Card, CardHeader, CardTitle, CardBody, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ErrorState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { user, refreshUser, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace("/dashboard");
  }, [authLoading, isAuthenticated, router]);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; bio?: string }) => authApi.updateMe(data),
    onSuccess: () => {
      refreshUser();
      setEditing(false);
    },
  });

  const startEditing = () => {
    setName(user?.name || "");
    setBio(user?.bio || "");
    setEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({ name, bio });
  };

  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const solved = dashboard?.total_solved ?? 0;
  const badges: { name: string; desc: string; icon: LucideIcon; earned: boolean }[] = [
    { name: "First query", desc: "Solve your first problem", icon: Play, earned: solved > 0 },
    { name: "10 solved", desc: "Solve 10 problems", icon: Star, earned: solved >= 10 },
    { name: "50 solved", desc: "Solve 50 problems", icon: Trophy, earned: solved >= 50 },
    { name: "7-day streak", desc: "Submit on 7 consecutive days", icon: Flame, earned: (user?.streak || 0) >= 7 },
    { name: "100 XP", desc: "Earn 100 XP", icon: Gem, earned: (user?.xp || 0) >= 100 },
    { name: "Joins", desc: "Complete every JOIN problem", icon: Link2, earned: false },
    { name: "Window functions", desc: "Complete every window function problem", icon: Layers, earned: false },
    { name: "Completionist", desc: "Solve every problem", icon: Crown, earned: false },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <Page>
      <PageHeader title="Profile" description="Your account and achievements." />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Identity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Account</CardTitle>
            {!editing && (
              <Button variant="secondary" size="sm" onClick={startEditing}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardBody>
            {editing ? (
              <form onSubmit={handleSave} className="space-y-4">
                {updateMutation.isError && (
                  <ErrorState
                    title="Couldn't save changes"
                    description={updateMutation.error instanceof Error ? updateMutation.error.message : undefined}
                  />
                )}
                <Field label="Name" htmlFor="profile-name">
                  <Input
                    id="profile-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={100}
                  />
                </Field>
                <Field label="Bio" htmlFor="profile-bio" hint={`${bio.length} / 500`}>
                  <Textarea
                    id="profile-bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="A line or two about you"
                    maxLength={500}
                    rows={3}
                  />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={() => setEditing(false)}
                    disabled={updateMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="md" loading={updateMutation.isPending}>
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-4">
                <Avatar name={user?.name} src={user?.avatar_url} size="xl" />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-md font-semibold text-fg">{user?.name}</h2>
                  <p className="truncate text-sm text-fg-subtle">{user?.email}</p>
                  <p className="mt-3 text-sm leading-6 text-fg-muted">
                    {user?.bio || <span className="text-fg-faint">No bio yet.</span>}
                  </p>
                  <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                    <div>
                      <dt className="text-xs text-fg-subtle">Joined</dt>
                      <dd className="text-fg">{joined ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Role</dt>
                      <dd className="text-fg">{user?.is_admin ? "Admin" : "Member"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-fg-subtle">Badges</dt>
                      <dd className="text-fg tabular-nums">
                        {earnedCount} / {badges.length}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-4">
          <StatCard title="Solved" value={solved.toLocaleString()} loading={isLoading} />
          <StatCard title="Accuracy" value={`${dashboard?.accuracy ?? 0}%`} loading={isLoading} />
          <StatCard title="XP" value={(user?.xp ?? 0).toLocaleString()} />
          <StatCard title="Streak" value={`${user?.streak ?? 0} ${user?.streak === 1 ? "day" : "days"}`} />
        </div>
      </div>

      {/* Badges */}
      <Card className="mt-4">
        <CardHeader>
          <div>
            <CardTitle>Badges</CardTitle>
            <CardDescription>
              {earnedCount} of {badges.length} earned
            </CardDescription>
          </div>
        </CardHeader>
        <ul className="grid grid-cols-1 divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
          {badges.map((badge, i) => (
            <li
              key={badge.name}
              className={cn(
                "flex items-start gap-3 p-4",
                "sm:border-b sm:border-line sm:[&:nth-last-child(-n+2)]:border-b-0",
                "lg:[&:nth-last-child(-n+4)]:border-b-0",
                i % 2 === 0 ? "sm:border-r" : "",
                "lg:border-r lg:[&:nth-child(4n)]:border-r-0"
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-md border",
                  badge.earned
                    ? "border-accent-line bg-accent-subtle text-accent-text"
                    : "border-line bg-surface-2 text-fg-faint"
                )}
              >
                <badge.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("flex items-center gap-1.5 text-sm font-medium", badge.earned ? "text-fg" : "text-fg-muted")}>
                  {badge.name}
                  {badge.earned && <Check className="size-3.5 text-success" aria-label="Earned" />}
                </p>
                <p className="mt-0.5 text-xs text-fg-subtle">{badge.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
