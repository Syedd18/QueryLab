"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ui/empty-state";
import { LogoMark } from "@/components/brand";
import { expand, normal } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Client-side hint only — the server's own rules still decide. */
function passwordStrength(pw: string): { score: number; label: string } {
  if (!pw) return { score: 0, label: "" };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return { score, label: pw.length < 6 ? labels[0] : labels[score] };
}

type Mode = "login" | "signup";

export interface AuthModalOptions {
  mode?: Mode;
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

interface AuthModalContextValue {
  openAuth: (opts?: AuthModalOptions) => void;
  close: () => void;
}

const AuthModalContext = React.createContext<AuthModalContextValue | null>(null);

export function useAuthModal() {
  const ctx = React.useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [opts, setOpts] = React.useState<AuthModalOptions>({});
  const onSuccessRef = React.useRef<(() => void) | undefined>(undefined);

  const openAuth = React.useCallback((o?: AuthModalOptions) => {
    setOpts(o ?? {});
    onSuccessRef.current = o?.onSuccess;
    setOpen(true);
  }, []);

  const close = React.useCallback(() => setOpen(false), []);

  return (
    <AuthModalContext.Provider value={{ openAuth, close }}>
      {children}
      <AuthDialog
        open={open}
        opts={opts}
        onClose={close}
        onDone={() => {
          setOpen(false);
          onSuccessRef.current?.();
          onSuccessRef.current = undefined;
        }}
      />
    </AuthModalContext.Provider>
  );
}

function AuthDialog({
  open,
  opts,
  onClose,
  onDone,
}: {
  open: boolean;
  opts: AuthModalOptions;
  onClose: () => void;
  onDone: () => void;
}) {
  const { login, signup } = useAuth();
  const [mode, setMode] = React.useState<Mode>(opts.mode ?? "login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Reset when the dialog (re)opens.
  React.useEffect(() => {
    if (open) {
      setMode(opts.mode ?? "login");
      setName("");
      setEmail("");
      setPassword("");
      setError("");
      setLoading(false);
      setShowPassword(false);
    }
  }, [open, opts.mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(email, password);
      else await signup(name, email, password);
      onDone();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "login"
          ? "Invalid credentials"
          : "Could not create account"
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError("");
  };

  const headline = opts.title ?? (mode === "login" ? "Welcome back" : "Create your account");
  const subline =
    opts.description ??
    (mode === "login"
      ? "Sign in to submit solutions, earn XP, and keep your streak."
      : "Free forever. Save your progress and climb the leaderboard.");
  const strength = passwordStrength(password);
  const strengthTone = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"][strength.score];

  return (
    <Dialog open={open} onClose={onClose} title={headline} description={subline} headerless className="max-w-[26rem]">
      {/* Branded header band */}
      <div className="relative overflow-hidden rounded-t-xl border-b border-line bg-surface-2/60 px-7 pb-6 pt-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(var(--line-strong)_1px,transparent_0)] [background-size:16px_16px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)] opacity-60"
        />
        <div className="relative">
          <LogoMark className="size-9" />
          <p className="eyebrow mt-5">{mode === "login" ? "Sign in" : "New account"}</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={headline}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <h2 className="mt-1 font-display text-[1.875rem] leading-[2.125rem] tracking-[-0.01em] text-fg" aria-hidden>
                {headline}
              </h2>
              <p className="mt-1.5 text-sm leading-5 text-fg-muted" aria-hidden>
                {subline}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="space-y-5 px-7 pb-6 pt-5">
        <Tabs
          variant="segmented"
          aria-label="Authentication mode"
          value={mode}
          onChange={switchMode}
          className="w-full [&>button]:flex-1"
          items={[
            { id: "login", label: "Sign in" },
            { id: "signup", label: "Create account" },
          ]}
        />

        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorState title={mode === "login" ? "Sign in failed" : "Sign up failed"} description={error} />}

          <AnimatePresence initial={false}>
            {mode === "signup" && (
              <motion.div key="name" {...expand} transition={normal} className="overflow-hidden">
                <Field label="Name" htmlFor="auth-name">
                  <Input
                    id="auth-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    leadingIcon={<UserIcon />}
                    autoComplete="name"
                    required
                    minLength={2}
                  />
                </Field>
              </motion.div>
            )}
          </AnimatePresence>

          <Field label="Email" htmlFor="auth-email">
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              leadingIcon={<Mail />}
              autoComplete="email"
              required
              autoFocus
            />
          </Field>

          <Field label="Password" htmlFor="auth-password">
            <div className="relative">
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leadingIcon={<Lock />}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                className="pr-9"
              />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1 top-1/2 -translate-y-1/2"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </Button>
            </div>
            {mode === "signup" && password && (
              <div className="flex items-center gap-2.5 pt-1" aria-live="polite">
                <div className="flex flex-1 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-colors duration-200",
                        strength.score >= i ? strengthTone : "bg-surface-3"
                      )}
                    />
                  ))}
                </div>
                <span className="w-16 text-right text-2xs font-medium text-fg-subtle">{strength.label}</span>
              </div>
            )}
          </Field>

          <Button type="submit" variant="primary" size="lg" className="group mt-1 w-full" loading={loading}>
            {mode === "login" ? "Sign in" : "Create account"}
            {!loading && (
              <ArrowRight className="transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden />
            )}
          </Button>
        </form>
      </div>

      <div className="rounded-b-xl border-t border-line bg-surface-2/50 px-7 py-3.5 text-center text-sm text-fg-subtle">
        {mode === "login" ? "New to qryntiq? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => switchMode(mode === "login" ? "signup" : "login")}
          className="font-medium text-fg underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-fg"
        >
          {mode === "login" ? "Create an account" : "Sign in"}
        </button>
      </div>
    </Dialog>
  );
}
