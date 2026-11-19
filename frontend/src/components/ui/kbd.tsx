import { cn } from "@/lib/utils";

export function Kbd({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-b-2 border-line bg-surface px-1.5 font-mono text-[0.65625rem] font-medium leading-none text-fg-subtle",
        className
      )}
      {...props}
    />
  );
}
