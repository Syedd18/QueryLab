"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface Day {
  date: string;
  day: string;
  count: number;
}

/** Round up to a clean, even axis max so the midpoint tick is an integer. */
function niceMax(max: number) {
  if (max <= 2) return 2;
  if (max <= 4) return 4;
  if (max <= 6) return 6;
  if (max <= 10) return 10;
  const pow = 10 ** Math.floor(Math.log10(max));
  const steps = [2, 4, 5, 10];
  for (const s of steps) {
    const candidate = s * pow;
    if (candidate >= max && candidate % 2 === 0) return candidate;
  }
  return 2 * 10 ** Math.ceil(Math.log10(max));
}

/**
 * Seven-day column chart. One series, so no legend: the card title names it.
 * Hairline gridlines, bars capped at 24px, value labelled only on the peak,
 * every bar has a hover/focus tooltip and a table equivalent for screen readers.
 */
export function WeeklyActivityChart({
  data,
  className,
}: {
  data: Day[];
  className?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.count), 0);
  const top = niceMax(max);
  const ticks = [top, top / 2, 0];
  const peakIndex = max > 0 ? data.findIndex((d) => d.count === max) : -1;
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className={cn("relative", className)}>
      <div className="flex gap-3">
        {/* Y axis */}
        <div className="relative h-32 w-6 shrink-0 text-right text-xs text-fg-faint tabular-nums">
          {ticks.map((t, i) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative h-32 flex-1">
          {ticks.map((t, i) => (
            <div
              key={t}
              className={cn(
                "absolute inset-x-0 border-t",
                i === ticks.length - 1 ? "border-line-strong" : "border-line"
              )}
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex items-end" role="list">
            {data.map((d, i) => {
              const h = top > 0 ? (d.count / top) * 100 : 0;
              const isActive = active === i;
              return (
                <div
                  key={d.date}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${d.day}, ${d.date}: ${d.count} ${d.count === 1 ? "submission" : "submissions"}`}
                  onMouseEnter={() => setActive(i)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 items-end justify-center rounded-sm outline-none"
                >
                  {/* hit area highlight */}
                  <div
                    className={cn(
                      "absolute inset-y-0 inset-x-1 rounded-sm transition-colors",
                      isActive && "bg-surface-2"
                    )}
                    aria-hidden
                  />
                  <div
                    className={cn(
                      "relative w-full max-w-6 rounded-t-sm transition-colors",
                      d.count > 0 ? "bg-accent" : "bg-line",
                      isActive && d.count > 0 && "bg-accent-hover"
                    )}
                    style={{ height: d.count > 0 ? `max(${h}%, 2px)` : "2px" }}
                    aria-hidden
                  >
                    {i === peakIndex && !isActive && (
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-medium text-fg tabular-nums">
                        {d.count}
                      </span>
                    )}
                  </div>

                  {isActive && (
                    <div
                      role="tooltip"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-surface px-2 py-1 text-xs shadow-overlay"
                    >
                      <span className="font-medium text-fg tabular-nums">{d.count}</span>
                      <span className="text-fg-subtle">
                        {" "}
                        {d.count === 1 ? "submission" : "submissions"} · {d.day}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="mt-2 flex pl-9">
        {data.map((d) => (
          <span key={d.date} className="flex-1 text-center text-xs text-fg-subtle">
            {d.day}
          </span>
        ))}
      </div>

      <p className="mt-3 text-xs text-fg-subtle tabular-nums">
        {total} {total === 1 ? "submission" : "submissions"} in the last 7 days
      </p>

      {/* Table equivalent for assistive tech */}
      <table className="sr-only">
        <caption>Submissions per day, last 7 days</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Submissions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <td>{d.date}</td>
              <td>{d.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
