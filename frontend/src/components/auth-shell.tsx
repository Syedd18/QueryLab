"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, type LucideIcon } from "lucide-react";
import { LogoMark, Logo } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { fadeUp, normal } from "@/lib/motion";

/* The brand panel is intentionally dark in both app themes (it mirrors the
   qryntiq identity frames). Literal hexes from the dark collection keep it
   constant regardless of the active theme. */
const D = {
  bg: "#101214",
  panel: "#16181b",
  surface: "#16181b",
  surface2: "#1c1f23",
  line: "#2a2e33",
  lineSoft: "#22262b",
  white: "#f4f2ee",
  text: "#e9e7e2",
  muted: "#aeaca6",
  faint: "#65646a",
  accent: "#b3c7da",
  accentText: "#9fbad4",
  green: "#84b493",
  greenBg: "#17241c",
  amber: "#d7b06e",
  amberBg: "#28211a",
};

/** A compact, always-dark rendering of the practice console. Not an illustration —
    it is the same layout the product uses, built from the design tokens. */
function ConsoleMock() {
  const kw = (s: string) => <span style={{ color: D.accentText, fontWeight: 500 }}>{s}</span>;
  const ln = (n: number) => (
    <span style={{ color: D.faint, userSelect: "none", paddingRight: 16 }}>{n}</span>
  );
  const rows = [
    ["Engineering", "Priya Natarajan", "184,000"],
    ["Product", "Jonas Weber", "151,500"],
    ["Sales", "Amara Okafor", "128,250"],
  ];
  return (
    <div
      className="w-full overflow-hidden rounded-lg"
      style={{ backgroundColor: D.surface, border: `1px solid ${D.line}`, boxShadow: "0 24px 48px rgb(0 0 0 / 0.45)" }}
    >
      {/* window header */}
      <div className="flex h-10 items-center justify-between px-3" style={{ borderBottom: `1px solid ${D.lineSoft}` }}>
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium"
            style={{ backgroundColor: D.surface2, color: D.text }}
          >
            Run
          </span>
          <span
            className="inline-flex h-7 items-center rounded-md px-2.5 text-xs font-medium"
            style={{ backgroundColor: D.accent, color: "#0f1822" }}
          >
            Submit
          </span>
        </div>
        <span className="font-mono text-2xs" style={{ color: D.faint }}>
          Ctrl + Enter
        </span>
      </div>

      {/* code */}
      <pre className="overflow-hidden px-4 py-3 font-mono text-xs leading-5" style={{ color: D.text }}>
        <code>
          {ln(1)}
          {kw("SELECT")} d.name, e.full_name, e.salary{"\n"}
          {ln(2)}
          {kw("FROM")} employees e{"\n"}
          {ln(3)}
          {kw("JOIN")} departments d {kw("ON")} d.id = e.department_id{"\n"}
          {ln(4)}
          {kw("WHERE")} e.salary = ({kw("SELECT")} MAX(salary){"\n"}
          {ln(5)}
          {"  "}
          {kw("FROM")} employees {kw("WHERE")} department_id = e.department_id){"\n"}
          {ln(6)}
          {kw("ORDER BY")} d.name;
        </code>
      </pre>

      {/* result header */}
      <div
        className="flex h-9 items-center justify-between px-3 text-xs"
        style={{ borderTop: `1px solid ${D.lineSoft}`, borderBottom: `1px solid ${D.lineSoft}` }}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: D.text, fontWeight: 500 }}>Output</span>
          <span style={{ color: D.faint }}>Expected</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-2xs tabular-nums" style={{ color: D.faint }}>
            3 rows · 24 ms
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-2xs font-medium"
            style={{ backgroundColor: D.greenBg, color: D.green }}
          >
            <CheckCircle2 className="size-3" aria-hidden />
            Correct · +20 XP
          </span>
        </div>
      </div>

      {/* result table */}
      <table className="w-full font-mono text-2xs tabular-nums">
        <thead>
          <tr style={{ backgroundColor: D.surface2, color: D.faint, textAlign: "left" }}>
            <th className="h-7 px-3 font-medium" style={{ borderBottom: `1px solid ${D.lineSoft}` }}>
              name
            </th>
            <th className="h-7 px-3 font-medium" style={{ borderBottom: `1px solid ${D.lineSoft}` }}>
              full_name
            </th>
            <th className="h-7 px-3 text-right font-medium" style={{ borderBottom: `1px solid ${D.lineSoft}` }}>
              salary
            </th>
          </tr>
        </thead>
        <tbody style={{ color: D.text }}>
          {rows.map(([a, b, c], i) => (
            <tr key={a}>
              <td className="px-3 py-1.5" style={{ borderBottom: i < rows.length - 1 ? `1px solid ${D.lineSoft}` : "none" }}>
                {a}
              </td>
              <td className="px-3 py-1.5" style={{ borderBottom: i < rows.length - 1 ? `1px solid ${D.lineSoft}` : "none" }}>
                {b}
              </td>
              <td
                className="px-3 py-1.5 text-right"
                style={{ borderBottom: i < rows.length - 1 ? `1px solid ${D.lineSoft}` : "none" }}
              >
                {c}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BrandPanel() {
  return (
    <aside
      className="relative hidden h-full flex-col justify-between overflow-hidden p-10 lg:flex xl:p-12"
      style={{ backgroundColor: D.bg, color: D.text, borderRight: `1px solid ${D.line}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <LogoMark style={{ color: D.accent }} />
          <span
            className="select-none font-brand text-[1.0625rem] font-semibold leading-none tracking-[-0.015em]"
            style={{ color: D.white }}
          >
            qrynt
            <span className="relative inline-block">
              {"ı"}
              <span
                aria-hidden
                className="absolute left-1/2 top-[0.14em] size-[0.16em] -translate-x-1/2 rounded-full"
                style={{ backgroundColor: D.accent }}
              />
            </span>
            q
          </span>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-2xs font-medium uppercase tracking-[0.1em]"
          style={{ backgroundColor: D.panel, color: D.muted, border: `1px solid ${D.line}` }}
        >
          The SQL workspace
        </span>
      </div>

      <div className="my-10 flex flex-1 flex-col justify-center gap-8">
        <div className="max-w-md">
          <h2
            className="font-display text-[3.25rem] font-normal leading-[1.02] tracking-[-0.015em]"
            style={{ color: D.white }}
          >
            Precision in
            <br />
            <span className="italic" style={{ color: D.muted }}>
              every query.
            </span>
          </h2>
          <p className="mt-4 text-sm leading-6" style={{ color: D.muted }}>
            A dedicated environment for deliberate SQL practice, real-world problems, and interview
            preparation.
          </p>
        </div>

        <ConsoleMock />
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2" style={{ borderTop: `1px solid ${D.line}`, paddingTop: 24 }}>
        {["Real execution", "Row-level checks", "XP & streaks"].map((t) => (
          <span
            key={t}
            className="flex items-center gap-2 text-2xs font-medium uppercase tracking-[0.12em]"
            style={{ color: D.faint }}
          >
            <span className="size-1 rounded-full" style={{ backgroundColor: D.accent }} aria-hidden />
            {t}
          </span>
        ))}
      </div>
    </aside>
  );
}

/** Split auth layout: dark brand panel with a live product console + focused form card. */
export function AuthShell({
  title,
  description,
  icon: Icon,
  children,
  footer,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:h-dvh lg:overflow-hidden lg:grid-cols-[1.1fr_1fr] xl:grid-cols-[1.15fr_1fr]">
      <BrandPanel />

      <main className="relative flex min-h-dvh flex-col overflow-hidden bg-canvas lg:h-full lg:min-h-0">
        {/* Subtle dot-grid texture, faded toward the edges. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--color-line)_1px,transparent_0)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_72%)]"
        />

        <header className="relative z-10 flex h-16 shrink-0 items-center justify-between px-6 lg:hidden">
          <Link href="/" className="rounded-md" aria-label="qryntiq home">
            <Logo />
          </Link>
        </header>

        <div className="relative z-10 flex flex-1 items-center justify-center overflow-y-auto px-6 pb-10 pt-2 sm:pt-0 lg:px-10">
          <motion.div {...fadeUp} transition={normal} className="w-full max-w-[25rem]">
            <Card className="overflow-hidden rounded-xl p-0 shadow-[var(--highlight),var(--shadow-overlay)]">
              <div className="p-7 sm:p-9">
                {Icon && (
                  <span className="mb-6 inline-flex size-10 items-center justify-center rounded-lg border border-line bg-surface-2 text-fg-muted shadow-xs">
                    <Icon className="size-[18px]" strokeWidth={1.6} aria-hidden />
                  </span>
                )}
                <h1 className="font-display text-[2.125rem] font-normal leading-[2.375rem] tracking-[-0.012em] text-fg">
                  {title}
                </h1>
                {description && <p className="mt-2 text-sm text-fg-muted">{description}</p>}
                <div className="mt-7">{children}</div>
              </div>
            </Card>
            {footer && <p className="mt-5 text-center text-sm text-fg-subtle">{footer}</p>}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
