import type { PresetPair } from "@/lib/presets";
import { cn } from "@/lib/utils";

// A circle split diagonally (top-left half = light variant, bottom-right half
// = dark variant). The optional label is rendered twice - once per half,
// each clipped - so the initials appear in their corresponding fg color
// across the diagonal split.

const SIZE: Record<"sm" | "md" | "lg", string> = {
  sm: "size-6 text-[10px]",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

export function SplitBadge({
  colors,
  label,
  size = "md",
  className,
  title,
}: {
  colors: PresetPair;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full font-semibold ring-1 ring-input",
        SIZE[size],
        className
      )}
      title={title}
    >
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundColor: colors.light.bg,
          color: colors.light.fg,
          clipPath: "polygon(0 0, 100% 0, 0 100%)",
        }}
        aria-hidden
      >
        {label}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          backgroundColor: colors.dark.bg,
          color: colors.dark.fg,
          clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
        }}
        aria-hidden
      >
        {label}
      </span>
    </span>
  );
}
