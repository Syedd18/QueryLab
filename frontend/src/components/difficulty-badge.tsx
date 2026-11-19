import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Difficulty = "Easy" | "Medium" | "Hard";

const toneFor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

/** Difficulty chip: token-driven tone plus a dot, identical in both themes. */
export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty | string;
  className?: string;
}) {
  const tone = toneFor[difficulty as Difficulty] ?? "neutral";
  return (
    <Badge tone={tone} dot className={cn("gap-1.5", className)}>
      {difficulty}
    </Badge>
  );
}
