"use client";

import * as React from "react";
import { Eye, EyeOff, Mail, Lock, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { ErrorState } from "@/components/ui/empty-state";

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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={opts.title ?? (mode === "login" ? "Sign in" : "Create your account")}
      description={
        opts.description ??
        (mode === "login"
          ? "Sign in to submit solutions and track your progress."
          : "Free, no credit card. Start tracking your progress.")
      }
    >
      <div className="space-y-4">
        <Tabs
          variant="segmented"
          aria-label="Authentication mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError("");
          }}
          className="w-full [&>button]:flex-1"
          items={[
            { id: "login", label: "Sign in" },
            { id: "signup", label: "Create account" },
          ]}
        />

        <form onSubmit={submit} className="space-y-4">
          {error && <ErrorState title={mode === "login" ? "Sign in failed" : "Sign up failed"} description={error} />}

          {mode === "signup" && (
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
          )}

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
          </Field>

          <Button type="submit" variant="primary" size="lg" className="w-full" loading={loading}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>
      </div>
    </Dialog>
  );
}
