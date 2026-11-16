import { Badge } from "@/components/ui/badge";

export type Difficulty = "Easy" | "Medium" | "Hard";

const toneFor: Record<Difficulty, "success" | "warning" | "danger"> = {
  Easy: "success",
  Medium: "warning",
  Hard: "danger",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty | string;
  className?: string;
}) {
  const tone = toneFor[difficulty as Difficulty] ?? "neutral";
  return (
    <Badge tone={tone} className={className}>
      {difficulty}
    </Badge>
  );
}
