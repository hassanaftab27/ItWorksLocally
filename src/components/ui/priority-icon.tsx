import type { Priority } from "@/types/app";
import { cn } from "@/lib/utils";

// 4 escalating bars (think signal-strength meter). The bar at the current
// priority level and all bars below it are filled; bars above it are dimmed.
// Pair this with the priority color (yellow/orange/red/pink) so the level is
// communicated both by *how many* bars light up and by the hue.
const LEVEL: Record<Priority, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

const BARS = [
  { x: 0.5, y: 11, h: 4 },
  { x: 4.5, y: 8, h: 7 },
  { x: 8.5, y: 5, h: 10 },
  { x: 12.5, y: 2, h: 13 },
];

export function PriorityIcon({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const level = LEVEL[priority];
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      {BARS.map((b, i) => (
        <rect
          key={i}
          x={b.x}
          y={b.y}
          width={3}
          height={b.h}
          rx="0.7"
          opacity={i + 1 <= level ? 1 : 0.25}
        />
      ))}
    </svg>
  );
}
