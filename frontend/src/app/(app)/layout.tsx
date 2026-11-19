"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Sidebar, pageTitleFor } from "@/components/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { useProfileModal } from "@/components/profile-modal";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();
  const { openProfile } = useProfileModal();
  const pathname = usePathname();
  const router = useRouter();
  const section = pageTitleFor(pathname);

  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/practice?search=${encodeURIComponent(q)}` : "/practice");
  };

  return (
    <div className="flex min-h-dvh bg-canvas">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col pt-12 lg:pt-0">
        {/* Top bar: breadcrumb · search · notifications · account */}
        <header className="sticky top-0 z-30 hidden h-14 shrink-0 items-center gap-6 border-b border-line bg-canvas/85 px-6 backdrop-blur-md lg:flex xl:px-10">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2.5">
            <span className="eyebrow text-fg-faint">Workspace</span>
            <span className="h-3.5 w-px rotate-[18deg] bg-line-strong" aria-hidden />
            <span className="text-sm font-medium text-fg" aria-current="page">
              {section}
            </span>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <form onSubmit={submitSearch} role="search" className="group relative mr-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-faint transition-colors group-focus-within:text-fg-muted"
                strokeWidth={1.75}
                aria-hidden
              />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search problems…"
                aria-label="Search problems"
                className="h-9 w-[280px] rounded-md border border-line bg-surface pl-9 pr-16 text-sm text-fg shadow-xs placeholder:text-fg-faint transition-[width,border-color,box-shadow] duration-200 hover:border-line-strong focus:w-[340px] [&::-webkit-search-cancel-button]:hidden"
              />
              <span className="pointer-events-none absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </form>

            <ThemeToggle className="text-fg-muted" />

            {isAuthenticated ? (
              <>
                <Tooltip label="No new notifications">
                  <Button variant="ghost" size="icon-sm" aria-label="Notifications" className="text-fg-muted">
                    <Bell strokeWidth={1.75} />
                  </Button>
                </Tooltip>
                <Tooltip label="Your profile">
                  <button
                    type="button"
                    onClick={openProfile}
                    aria-label="Open profile"
                    className="rounded-full ring-offset-2 ring-offset-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <Avatar
                      name={user?.name}
                      src={user?.avatar_url}
                      size="md"
                      className="border-transparent bg-accent-subtle text-accent-text"
                    />
                  </button>
                </Tooltip>
              </>
            ) : (
              <div className="ml-1 flex items-center gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => openAuth({ mode: "login" })}>
                  Sign in
                </Button>
                <Button variant="primary" size="sm" onClick={() => openAuth({ mode: "signup" })}>
                  Create account
                </Button>
              </div>
            )}
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
