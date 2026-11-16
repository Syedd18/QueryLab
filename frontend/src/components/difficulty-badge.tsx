import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Difficulty = "Easy" | "Medium" | "Hard";

const colorFor: Record<Difficulty, string> = {
  Easy: "bg-[#e6f6f2] text-[#008a7a] dark:bg-[#123c36] dark:text-[#00b8a3]",
  Medium: "bg-[#fff6db] text-[#ad7900] dark:bg-[#3f351c] dark:text-[#ffc01e]",
  Hard: "bg-[#fdeceb] text-[#d33a2c] dark:bg-[#432523] dark:text-[#ef4743]",
};

export function DifficultyBadge({
  difficulty,
  className,
}: {
  difficulty: Difficulty | string;
  className?: string;
}) {
  const color = colorFor[difficulty as Difficulty];
  return (
    <Badge tone="neutral" className={cn(color, className)}>
      {difficulty}
    </Badge>
  );
}
