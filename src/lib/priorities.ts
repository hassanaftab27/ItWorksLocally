import type { Priority } from "@/types/app";

export const PRIORITIES: Priority[] = ["low", "medium", "high", "critical"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

// Four clearly different hues so the levels never blur into each other:
//   low      = pure bright yellow (no orange tint)
//   medium   = pure orange
//   high     = deep red (no pink tint)
//   critical = fuchsia/magenta (purple-pink, clearly different from red)
// Same hue family in both modes; dark mode just brightens the shade.
export const PRIORITY_COLORS: Record<Priority, string> = {
  low: "text-yellow-400 dark:text-yellow-300",
  medium: "text-orange-500 dark:text-orange-400",
  high: "text-red-600 dark:text-red-500",
  critical: "text-fuchsia-500 dark:text-fuchsia-400",
};
