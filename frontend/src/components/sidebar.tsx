"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { useState } from "react";
import {
  LayoutGrid,
  Code2,
  List,
  BookOpen,
  Building2,
  Bookmark,
  Trophy,
  Settings,
  LogOut,
  LogIn,
  Menu,
  X,
  ChevronsUpDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/components/auth-modal";
import { useProfileModal } from "@/components/profile-modal";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";
import { fade, quick } from "@/lib/motion";

export const SIDEBAR_WIDTH = 244;
export const SIDEBAR_COLLAPSED_WIDTH = 64;

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
};

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutGrid },
      { label: "Practice", href: "/practice", icon: Code2 },
      { label: "Problems", href: "/admin", icon: List, adminOnly: true },
      { label: "SQL Topics", href: "/categories", icon: BookOpen },
      { label: "Companies", href: "/companies", icon: Building2 },
    ],
  },
  {
    label: "My activity",
    items: [
      { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
      { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ],
  },
];

export function pageTitleFor(pathname: string | null): string {
  for (const g of groups) {
    const hit = g.items.find((i) => pathname === i.href || pathname?.startsWith(i.href + "/"));
    if (hit) return hit.label;
  }
  if (pathname?.startsWith("/profile")) return "Settings";
  return "Workspace";
}

const slide = { type: "spring", stiffness: 500, damping: 40, mass: 0.7 } as const;

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
}: NavItem & {
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150",
        collapsed && "justify-center px-0",
        active ? "font-medium text-fg" : "text-fg-muted hover:bg-surface-3/55 hover:text-fg"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          transition={slide}
          className="absolute inset-0 rounded-md border border-line bg-surface shadow-[var(--highlight),var(--shadow-xs)]"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "relative size-4 shrink-0 transition-colors",
          active ? "text-accent-text" : "text-fg-subtle group-hover:text-fg-muted"
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      {!collapsed && <span className="relative flex-1 truncate">{label}</span>}
    </Link>
  );
  if (collapsed) {
    return (
      <Tooltip label={label} side="bottom" className="w-full [&>a]:w-full">
        {link}
      </Tooltip>
    );
  }
  return link;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuth();
  const { openAuth } = useAuthModal();
  const { openProfile } = useProfileModal();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  const content = (isCollapsed: boolean, closeMobile?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Header — same 56px rhythm as the top bar so the rules line up */}
      <div className={cn("flex h-14 shrink-0 items-center px-4", isCollapsed && "justify-center px-0")}>
        <Link href="/dashboard" className="rounded-md" aria-label="qryntiq home">
          <Logo compact={isCollapsed} />
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto hidden text-fg-subtle lg:inline-flex"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            aria-expanded
          >
            <PanelLeftClose strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-3" aria-label="Main">
        {groups.map((group, gi) => {
          const items = group.items.filter((i) => !i.adminOnly || user?.is_admin);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className={cn(gi > 0 && "mt-7")}>
              {!isCollapsed ? (
                <p className="eyebrow mb-2 px-2.5 text-fg-faint">{group.label}</p>
              ) : (
                gi > 0 && <div className="mx-3 mb-4 border-t border-line" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={!!isActive(item.href)}
                    collapsed={isCollapsed}
                    onClick={closeMobile}
                  />
                ))}
              </div>
            </div>
          );
        })}
        {isCollapsed && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-fg-subtle"
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              aria-expanded={false}
            >
              <PanelLeftOpen strokeWidth={1.75} />
            </Button>
          </div>
        )}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-line px-3 py-3">
        {isAuthenticated && (
          <button
            type="button"
            onClick={() => {
              openProfile();
              closeMobile?.();
            }}
            className={cn(
              "group flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-fg-muted transition-colors hover:bg-surface-3/55 hover:text-fg",
              isCollapsed && "justify-center px-0"
            )}
          >
            <Settings className="size-4 shrink-0 text-fg-subtle group-hover:text-fg-muted" strokeWidth={1.75} aria-hidden />
            {!isCollapsed && <span>Settings</span>}
          </button>
        )}

        {isAuthenticated ? (
          <div className={cn("mt-2 flex items-center gap-1", isCollapsed && "justify-center")}>
            <button
              type="button"
              onClick={() => {
                openProfile();
                closeMobile?.();
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-3/55",
                isCollapsed && "flex-none justify-center px-0"
              )}
            >
              <Avatar
                name={user?.name}
                src={user?.avatar_url}
                size="md"
                className="border-line bg-accent-subtle text-accent-text"
              />
              {!isCollapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{user?.name}</span>
                    <span className="block truncate text-xs text-fg-subtle">
                      {user?.is_admin ? "Admin workspace" : "Personal workspace"}
                    </span>
                  </span>
                  <ChevronsUpDown className="size-3.5 shrink-0 text-fg-faint" aria-hidden />
                </>
              )}
            </button>
            {!isCollapsed && (
              <Tooltip label="Sign out" side="top">
                <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Sign out" className="text-fg-subtle">
                  <LogOut strokeWidth={1.75} />
                </Button>
              </Tooltip>
            )}
          </div>
        ) : isCollapsed ? (
          <div className="mt-2 flex justify-center">
            <Tooltip label="Sign in" side="top">
              <Button variant="ghost" size="icon" aria-label="Sign in" onClick={() => openAuth({ mode: "login" })}>
                <LogIn strokeWidth={1.75} />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="space-y-1.5">
            <p className="px-1 pb-1 text-xs leading-5 text-fg-subtle">
              Save progress, earn XP, and keep your streak.
            </p>
            <Button variant="primary" size="sm" className="w-full" onClick={() => openAuth({ mode: "signup" })}>
              Create account
            </Button>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => openAuth({ mode: "login" })}>
              Sign in
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b border-line bg-sidebar/95 px-3 backdrop-blur-sm lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu strokeWidth={1.75} />
        </Button>
        <Logo />
        <ThemeToggle className="ml-auto text-fg-muted" />
      </header>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              {...fade}
              transition={quick}
              className="fixed inset-0 z-40 bg-[rgb(20_20_22/0.42)] dark:bg-[rgb(0_0_0/0.6)] lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -16, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-line shadow-overlay lg:hidden"
              aria-label="Navigation"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 z-10"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X strokeWidth={1.75} />
              </Button>
              <LayoutGroup id="nav-mobile">{content(false, () => setMobileOpen(false))}</LayoutGroup>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar: collapses to a 64px rail */}
      <aside
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        className="sticky top-0 hidden h-dvh shrink-0 border-r border-line transition-[width] duration-200 ease-out lg:block"
        aria-label="Navigation"
      >
        <LayoutGroup id="nav-desktop">{content(collapsed)}</LayoutGroup>
      </aside>
    </>
  );
}
