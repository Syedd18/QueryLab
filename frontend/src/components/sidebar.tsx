"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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

export const SIDEBAR_WIDTH = 240;
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

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onClick,
  trailing,
}: NavItem & {
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  trailing?: React.ReactNode;
}) {
  const link = (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-[34px] items-center gap-3 rounded-md px-3 text-sm transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-surface-2 font-medium text-fg dark:bg-[#30363B] dark:text-[#F0F1F2] dark:[&>svg]:text-[#A9C0D4]"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg dark:text-[#A0A5AA] dark:[&>svg]:text-[#858E96] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2]"
      )}
    >
      <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
      {!collapsed && <span className="flex-1 truncate">{label}</span>}
      {!collapsed && trailing}
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

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 px-3 text-2xs font-medium uppercase tracking-[0.08em] text-fg-faint dark:text-[#777F87]">
      {children}
    </p>
  );
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
    <div className="flex h-full flex-col bg-surface dark:bg-[#1b1f22]">
      {/* Header */}
      <div
        className={cn(
          "flex h-16 shrink-0 items-center px-5",
          isCollapsed && "justify-center px-0"
        )}
      >
        <Link href="/dashboard" className="rounded-md" aria-label="qryntiq home">
          <Logo compact={isCollapsed} className="dark:[&_svg]:text-[#7893AD]" />
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto hidden text-fg-subtle hover:bg-[#292F34] dark:text-[#858E96] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2] lg:inline-flex"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            aria-expanded
          >
            <PanelLeftClose strokeWidth={1.75} />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Main">
        {groups.map((group, gi) => {
          const items = group.items.filter((i) => !i.adminOnly || user?.is_admin);
          if (items.length === 0) return null;
          return (
            <div key={group.label} className={cn(gi > 0 && "mt-6")}>
              {!isCollapsed ? (
                <GroupLabel>{group.label}</GroupLabel>
              ) : (
                gi > 0 && <div className="mx-3 mb-3 border-t border-line dark:border-[#383E43]" />
              )}
              <div className="space-y-0.5">
                {items.map((item) => (
                  <NavLink
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
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
              className="text-fg-subtle hover:bg-[#292F34] dark:text-[#858E96] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2]"
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
      <div className="shrink-0 border-t border-line px-3 py-3 dark:border-[#383E43]">
        <div className="space-y-0.5">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => {
                openProfile();
                closeMobile?.();
              }}
              className={cn(
                "flex h-[34px] w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg dark:text-[#A0A5AA] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2] dark:[&>svg]:text-[#858E96]",
                isCollapsed && "justify-center px-0"
              )}
            >
              <Settings className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {!isCollapsed && <span>Settings</span>}
            </button>
          )}
        </div>

        {isAuthenticated ? (
          <div className={cn("mt-2 flex items-center gap-1", isCollapsed && "justify-center")}>
            <button
              type="button"
              onClick={() => {
                openProfile();
                closeMobile?.();
              }}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-surface-2 dark:hover:bg-[#292F34]",
                isCollapsed && "flex-none justify-center px-0"
              )}
            >
              <Avatar name={user?.name} src={user?.avatar_url} size="md" className="border-transparent bg-accent-subtle text-accent-text dark:bg-[#30363B] dark:text-[#A9C0D4]" />
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
              <Tooltip label="Sign out">
                <Button variant="ghost" size="icon-sm" onClick={logout} aria-label="Sign out" className="text-fg-subtle dark:text-[#858E96] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2]">
                  <LogOut strokeWidth={1.75} />
                </Button>
              </Tooltip>
            )}
          </div>
        ) : isCollapsed ? (
          <div className="mt-2 flex justify-center">
            <Tooltip label="Sign in">
              <Button variant="ghost" size="icon" aria-label="Sign in" onClick={() => openAuth({ mode: "login" })} className="dark:text-[#858E96] dark:hover:bg-[#292F34] dark:hover:text-[#F0F1F2]">
                <LogIn strokeWidth={1.75} />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="mt-2 space-y-1.5">
            <Button variant="primary" size="sm" className="w-full" onClick={() => openAuth({ mode: "login" })}>
              Sign in
            </Button>
            <Button variant="secondary" size="sm" className="w-full" onClick={() => openAuth({ mode: "signup" })}>
              Create account
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header       className="fixed inset-x-0 top-0 z-40 flex h-12 items-center gap-2 border-b border-line bg-surface px-3 dark:border-[#383E43] dark:bg-[#1b1f22] lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
          aria-expanded={mobileOpen}
        >
          <Menu strokeWidth={1.75} />
        </Button>
        <Logo className="dark:[&_svg]:text-[#7893AD]" />
        <ThemeToggle className="ml-auto text-fg-muted" />
      </header>

      {/* Mobile panel */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              {...fade}
              transition={quick}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <motion.aside
              initial={{ x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -8, opacity: 0 }}
              transition={quick}
              className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] border-r border-line bg-surface dark:border-[#383E43] dark:bg-[#1b1f22] lg:hidden"
              aria-label="Navigation"
            >
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-4"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              >
                <X strokeWidth={1.75} />
              </Button>
              {content(false, () => setMobileOpen(false))}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar: 240px, collapses to a 64px rail */}
      <aside
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
        className="sticky top-0 hidden h-dvh shrink-0 border-r border-line bg-surface transition-[width] duration-150 ease-out dark:border-[#383E43] dark:bg-[#1b1f22] lg:block"
        aria-label="Navigation"
      >
        {content(collapsed)}
      </aside>
    </>
  );
}
