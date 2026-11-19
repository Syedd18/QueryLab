"use client";

import { useMemo, useState } from "react";
import { Table2, KeyRound, Link2 } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Column {
  name: string;
  type: string;
  pk: boolean;
  notnull: boolean;
  note?: string;
  fk?: string; // "departments.id"
}
interface ParsedTable {
  name: string;
  columns: Column[];
}

/** Split a CREATE TABLE body on top-level commas only. */
function splitColumns(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

function parseSchema(sql: string): ParsedTable[] {
  const tables: ParsedTable[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?(\w+)["'`]?\s*\(([\s\S]*?)\)\s*;/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1];
    const body = m[2];
    const columns: Column[] = [];
    for (const raw of splitColumns(body)) {
      const commentMatch = raw.match(/--\s*(.*)$/m);
      const note = commentMatch ? commentMatch[1].trim() : undefined;
      const line = raw.replace(/--.*$/gm, "").trim();
      if (!line) continue;
      const upper = line.toUpperCase();
      // Skip table-level constraints.
      if (/^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CONSTRAINT|CHECK)\b/.test(upper)) continue;
      const tokens = line.split(/\s+/);
      const colName = tokens[0].replace(/["'`]/g, "");
      const type = tokens[1] ? tokens[1].toUpperCase() : "";
      let fk: string | undefined;
      const arrow = note?.match(/->\s*([\w.]+)/);
      if (arrow) fk = arrow[1];
      columns.push({
        name: colName,
        type,
        pk: /PRIMARY\s+KEY/.test(upper),
        notnull: /NOT\s+NULL/.test(upper),
        note: fk ? undefined : note,
        fk,
      });
    }
    if (columns.length) tables.push({ name, columns });
  }
  return tables;
}

export function SchemaView({
  sql,
  sampleSql,
  className,
}: {
  sql: string;
  sampleSql?: string | null;
  className?: string;
}) {
  const [view, setView] = useState<"tables" | "sql">("tables");
  const tables = useMemo(() => parseSchema(sql), [sql]);

  return (
    <div className={cn("space-y-3", className)}>
      <Tabs
        variant="segmented"
        size="sm"
        aria-label="Schema view"
        value={view}
        onChange={setView}
        items={[
          { id: "tables", label: "Tables" },
          { id: "sql", label: "SQL" },
        ]}
      />

      {view === "tables" && tables.length > 0 ? (
        <div className="space-y-3">
          {tables.map((t) => (
            <div key={t.name} className="overflow-hidden rounded-lg border border-line bg-surface shadow-xs">
              <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
                <Table2 className="size-3.5 text-fg-subtle" aria-hidden />
                <span className="font-mono text-xs font-medium text-fg">{t.name}</span>
                <span className="ml-auto text-2xs text-fg-subtle tabular-nums">
                  {t.columns.length} columns
                </span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {t.columns.map((c, i) => (
                    <tr key={c.name} className={cn("border-b border-line last:border-b-0")}>
                      <td className="w-px whitespace-nowrap px-3 py-1.5 font-mono text-fg">
                        <span className="inline-flex items-center gap-1.5">
                          {c.pk && <KeyRound className="size-3 text-warning" aria-label="Primary key" />}
                          {c.fk && <Link2 className="size-3 text-accent-text" aria-label="Foreign key" />}
                          {c.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-1.5">
                        <span className="font-mono text-fg-subtle">{c.type}</span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span className="inline-flex items-center gap-1.5">
                          {c.notnull && <Badge tone="neutral">NOT NULL</Badge>}
                          {c.fk && (
                            <span className="font-mono text-2xs text-fg-subtle">→ {c.fk}</span>
                          )}
                          {c.note && <span className="text-2xs text-fg-subtle">{c.note}</span>}
                          {i === 0 && c.pk && <Badge tone="accent">PK</Badge>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {sampleSql && (
            <details className="rounded-md border border-line">
              <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-fg-muted hover:text-fg">
                Sample data
              </summary>
              <pre className="overflow-x-auto border-t border-line bg-surface-2 p-3 font-mono text-2xs leading-5 text-fg-muted">
                {sampleSql}
              </pre>
            </details>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <pre className="overflow-x-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-xs leading-5 text-fg">
            {sql}
          </pre>
          {sampleSql && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-fg-subtle">Sample data</p>
              <pre className="overflow-x-auto rounded-md border border-line bg-surface-2 p-3 font-mono text-2xs leading-5 text-fg-muted">
                {sampleSql}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
