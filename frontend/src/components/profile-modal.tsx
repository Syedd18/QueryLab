"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, LogOut, Check, Link2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { authApi, dashboardApi } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { ErrorState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

interface ProfileModalContextValue {
  openProfile: () => void;
  close: () => void;
}
const Ctx = React.createContext<ProfileModalContextValue | null>(null);
export function useProfileModal() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useProfileModal must be used within ProfileModalProvider");
  return ctx;
}

export function ProfileModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const openProfile = React.useCallback(() => setOpen(true), []);
  const close = React.useCallback(() => setOpen(false), []);
  return (
    <Ctx.Provider value={{ openProfile, close }}>
      {children}
      <ProfileDialog open={open} onClose={close} />
    </Ctx.Provider>
  );
}

const AVATAR_STYLES = ["thumbs", "bottts", "identicon", "shapes", "glass", "fun-emoji"];
const dicebear = (style: string, seed: string) =>
  `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed || "qryntiq")}`;

function ProfileDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, isAuthenticated, logout, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = React.useState(false);
  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [avatar, setAvatar] = React.useState<string>("");
  const [customUrl, setCustomUrl] = React.useState("");

  const { data: dash } = useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
    enabled: open && isAuthenticated,
  });

  React.useEffect(() => {
    if (open) {
      setEditing(false);
      setName(user?.name ?? "");
      setBio(user?.bio ?? "");
      setAvatar(user?.avatar_url ?? "");
      setCustomUrl("");
    }
  }, [open, user]);

  const save = useMutation({
    mutationFn: () => authApi.updateMe({ name, bio, avatar_url: avatar }),
    onSuccess: () => {
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setEditing(false);
    },
  });

  if (!user) return null;

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const seed = user.name || user.email;
  const presets = [dicebear("initials", seed), ...AVATAR_STYLES.map((s) => dicebear(s, seed))];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Edit profile" : "Your profile"}
      description={editing ? "Update your details and avatar." : undefined}
      className="max-w-lg"
      headerless={!editing}
      footer={
        editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button variant="primary" loading={save.isPending} onClick={() => save.mutate()}>
              Save changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="destructive-ghost" onClick={() => { logout(); onClose(); }}>
              <LogOut />
              Sign out
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil />
              Edit profile
            </Button>
          </>
        )
      }
    >
      {editing ? (
        <div className="space-y-4">
          {save.isError && (
            <ErrorState
              title="Couldn't save"
              description={save.error instanceof Error ? save.error.message : undefined}
            />
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-fg-muted">Avatar</p>
            <div className="flex flex-wrap gap-2">
              {presets.map((url) => {
                const active = avatar === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setAvatar(url)}
                    aria-pressed={active}
                    aria-label="Choose avatar"
                    className={cn(
                      "relative rounded-full ring-offset-2 ring-offset-surface transition",
                      active ? "ring-2 ring-accent" : "ring-1 ring-line hover:ring-line-strong"
                    )}
                  >
                    <Avatar name={user.name} src={url} size="md" className="border-0" />
                    {active && (
                      <span className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-accent text-accent-fg">
                        <Check className="size-2.5" aria-hidden />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="Or paste an image URL"
                leadingIcon={<Link2 />}
                className="flex-1"
              />
              <Button
                variant="secondary"
                onClick={() => customUrl.trim() && setAvatar(customUrl.trim())}
                disabled={!customUrl.trim()}
              >
                Use
              </Button>
            </div>
          </div>

          <Field label="Name" htmlFor="pm-name">
            <Input id="pm-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </Field>
          <Field label="Bio" htmlFor="pm-bio" hint={`${bio.length} / 500`}>
            <Textarea
              id="pm-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A line or two about you"
              maxLength={500}
              rows={3}
            />
          </Field>
        </div>
      ) : (
        <div>
          {/* Identity band — same language as the sign-in modal */}
          <div className="relative overflow-hidden rounded-t-xl border-b border-line bg-surface-2/60 px-7 pb-6 pt-8">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line-strong)_1px,transparent_0)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] opacity-60"
            />
            <div className="relative flex items-end gap-4">
              <Avatar
                name={user.name}
                src={user.avatar_url}
                size="xl"
                className="shadow-[var(--highlight),var(--shadow-raised)] ring-4 ring-surface"
              />
              <div className="min-w-0 pb-1">
                <p className="eyebrow">{user.is_admin ? "Admin" : "Member"} · Joined {joined}</p>
                <p className="mt-1 truncate font-display text-[1.75rem] leading-8 tracking-[-0.01em] text-fg">
                  {user.name}
                </p>
                <p className="truncate text-sm text-fg-subtle">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-7 py-6">
            {user.bio && <p className="text-sm leading-6 text-fg-muted">{user.bio}</p>}

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
              {[
                { label: "Solved", value: dash?.total_solved ?? "—" },
                { label: "Accuracy", value: dash ? `${dash.accuracy}%` : "—" },
                { label: "XP", value: user.xp.toLocaleString() },
                { label: "Streak", value: user.streak },
              ].map((s) => (
                <div key={s.label} className="bg-surface px-4 py-3">
                  <p className="eyebrow">{s.label}</p>
                  <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-fg tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
