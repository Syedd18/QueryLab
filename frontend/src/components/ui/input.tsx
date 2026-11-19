"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-md border border-line bg-surface text-sm text-fg shadow-xs placeholder:text-fg-faint transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger aria-invalid:text-danger dark:bg-surface-2/60";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  leadingIcon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, leadingIcon, ...props }, ref) => {
    if (leadingIcon) {
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-faint [&_svg]:size-4">
            {leadingIcon}
          </span>
          <input ref={ref} className={cn(controlBase, "h-9 pl-9 pr-3", className)} {...props} />
        </div>
      );
    }
    return <input ref={ref} className={cn(controlBase, "h-9 px-3", className)} {...props} />;
  }
);
Input.displayName = "Input";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  mono?: boolean;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, mono, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        controlBase,
        "min-h-[80px] resize-y px-3 py-2 leading-5",
        mono && "font-mono text-xs leading-5",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(controlBase, "h-9 appearance-none pl-3 pr-8", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        aria-hidden
      />
    </div>
  )
);
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("block text-xs font-medium text-fg-muted", className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-fg-subtle">{hint}</p>
      ) : null}
    </div>
  );
}
