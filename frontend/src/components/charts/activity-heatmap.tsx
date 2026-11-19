"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Day {
  date: string; // YYYY-MM-DD
  count: number;
}

// Brand steel ramp: one hue at rising intensity, so the calendar reads as
// part of the product in both themes rather than a borrowed GitHub widget.
const LEVEL_CLASS = [
  "bg-surface-3",
  "bg-accent-text/25",
  "bg-accent-text/45",
  "bg-accent-text/70",
  "bg-accent-text",
];

function level(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
}

// Parse 'YYYY-MM-DD' as a local date (avoid UTC shifting the weekday).
function parseLocal(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""]; // label a few rows only

/**
 * Contribution calendar: columns are weeks (Sun→Sat top to bottom), cells are
 * days shaded by submission count. Hover a day for its exact count.
 */
export function ActivityHeatmap({ data, className }: { data: Day[]; className?: string }) {
  const [hover, setHover] = useState<{ day: Day; x: number; y: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // On narrow screens the calendar scrolls; open on the most recent weeks.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [data]);

  const { weeks, monthLabels, total } = useMemo(() => {
    const days = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const cells: (Day | null)[] = [];
    if (days.length) {
      // Pad so the first real day sits on its weekday row.
      const firstWeekday = parseLocal(days[0].date).getDay();
      for (let i = 0; i < firstWeekday; i++) cells.push(null);
    }
    for (const d of days) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: (Day | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

    // Month label appears on the first week whose first real day is in a new month.
    const monthLabels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const firstReal = week.find((c): c is Day => c !== null);
      if (!firstReal) return;
      const m = parseLocal(firstReal.date).getMonth();
      if (m !== lastMonth) {
        monthLabels.push({ col, label: MONTHS[m] });
        lastMonth = m;
      }
    });

    const total = days.reduce((s, d) => s + d.count, 0);
    return { weeks, monthLabels, total };
  }, [data]);

  return (
    <div data-heatmap className={cn("relative", className)}>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="inline-flex flex-col gap-1.5">
          {/* Month labels */}
          <div className="flex pl-8 text-xs text-fg-subtle">
            <div className="relative h-4" style={{ width: weeks.length * 15 }}>
              {monthLabels.map((m) => (
                <span key={`${m.col}-${m.label}`} className="absolute top-0" style={{ left: m.col * 15 }}>
                  {m.label}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-1.5">
            {/* Weekday labels */}
            <div className="flex w-7 shrink-0 flex-col gap-[3px] pr-1 text-right text-[10px] leading-3 text-fg-subtle">
              {WEEKDAYS.map((w, i) => (
                <span key={i} className="h-3 leading-3">
                  {w}
                </span>
              ))}
            </div>

            {/* Week columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, ci) => (
                <div key={ci} className="flex flex-col gap-[3px]">
                  {week.map((cell, ri) => {
                    if (!cell) return <div key={ri} className="size-3" />;
                    return (
                      <div
                        key={ri}
                        role="gridcell"
                        tabIndex={0}
                        aria-label={`${cell.count} ${cell.count === 1 ? "submission" : "submissions"} on ${cell.date}`}
                        onMouseEnter={(e) => {
                          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          const host = (e.currentTarget.closest("[data-heatmap]") as HTMLElement)?.getBoundingClientRect();
                          setHover({ day: cell, x: r.left - (host?.left ?? 0) + r.width / 2, y: r.top - (host?.top ?? 0) });
                        }}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover({ day: cell, x: 0, y: 0 })}
                        onBlur={() => setHover(null)}
                        className={cn(
                          "size-3 rounded-[3px] outline-none ring-offset-1 ring-offset-surface transition-transform duration-150 hover:scale-125 focus-visible:ring-2 focus-visible:ring-accent-text",
                          LEVEL_CLASS[level(cell.count)]
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer: total + legend */}
      <div className="mt-3 flex items-center justify-between text-xs text-fg-subtle">
        <span className="tabular-nums">
          {total} {total === 1 ? "submission" : "submissions"} in the last 26 weeks
        </span>
        <div className="flex items-center gap-1.5">
          <span>Less</span>
          {LEVEL_CLASS.map((c, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", c)} aria-hidden />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* Hover tooltip (anchored within the component) */}
      {hover && hover.x > 0 && (
        <div
          role="tooltip"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-fg px-2 py-1 text-xs text-canvas shadow-raised"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <span className="font-semibold tabular-nums">{hover.day.count}</span>
          <span className="opacity-70">
            {" "}
            {hover.day.count === 1 ? "submission" : "submissions"} · {hover.day.date}
          </span>
        </div>
      )}
    </div>
  );
}
