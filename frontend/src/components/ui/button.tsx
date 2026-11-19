"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap select-none",
    "rounded-md border font-medium tracking-[-0.005em]",
    "transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-150 ease-out",
    "active:scale-[0.975] disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-accent text-accent-fg shadow-[var(--highlight),var(--shadow-xs)] hover:bg-accent-hover active:bg-accent-active",
        secondary:
          "border-line bg-surface text-fg shadow-xs hover:border-line-strong hover:bg-surface-2 active:bg-surface-3",
        ghost:
          "border-transparent bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg active:bg-surface-3",
        destructive:
          "border-transparent bg-danger-solid text-white shadow-xs hover:brightness-110",
        "destructive-ghost":
          "border-transparent bg-transparent text-fg-muted hover:bg-danger-bg hover:text-danger",
      },
      size: {
        sm: "h-8 px-3 text-xs [&_svg]:size-3.5",
        md: "h-9 px-3.5 text-sm [&_svg]:size-4",
        lg: "h-10 px-[1.125rem] text-sm [&_svg]:size-4",
        icon: "h-9 w-9 [&_svg]:size-4",
        "icon-sm": "h-8 w-8 [&_svg]:size-4",
        "icon-xs": "h-7 w-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant, size, loading = false, disabled, children, type = "button", ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden /> : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

/** A link styled as a button. Use for navigation so links stay links. */
export function LinkButton({
  className,
  variant,
  size,
  children,
  ...props
}: LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> &
  VariantProps<typeof buttonVariants> & { children: React.ReactNode }) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}

export { buttonVariants };
