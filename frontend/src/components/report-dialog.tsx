"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { reportsApi, REPORT_CATEGORIES } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, Textarea, Field } from "@/components/ui/input";
import { ErrorState } from "@/components/ui/empty-state";

export function ReportDialog({
  open,
  onClose,
  questionId,
  questionTitle,
}: {
  open: boolean;
  onClose: () => void;
  questionId?: string;
  questionTitle?: string;
}) {
  const [category, setCategory] = React.useState<string>(REPORT_CATEGORIES[0]);
  const [message, setMessage] = React.useState("");
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setCategory(REPORT_CATEGORIES[0]);
      setMessage("");
      setDone(false);
    }
  }, [open]);

  const submit = useMutation({
    mutationFn: () => reportsApi.create({ question_id: questionId, category, message: message.trim() }),
    onSuccess: () => setDone(true),
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Report an issue"
      description={questionTitle ? `Problem: ${questionTitle}` : undefined}
      footer={
        done ? (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={submit.isPending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={submit.isPending}
              disabled={message.trim().length < 3}
              onClick={() => submit.mutate()}
            >
              Submit report
            </Button>
          </>
        )
      }
    >
      {done ? (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
          <div>
            <p className="text-sm font-medium text-fg">Thanks for the report</p>
            <p className="mt-0.5 text-sm text-fg-subtle">
              The team will take a look. You can keep practicing in the meantime.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {submit.isError && (
            <ErrorState
              title="Couldn't submit the report"
              description={submit.error instanceof Error ? submit.error.message : undefined}
            />
          )}
          <Field label="What's the issue?" htmlFor="report-category">
            <Select id="report-category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Details" htmlFor="report-message" hint={`${message.length} / 2000`}>
            <Textarea
              id="report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="Describe the issue — for example, what you expected versus what the checker accepted."
            />
          </Field>
        </div>
      )}
    </Dialog>
  );
}
