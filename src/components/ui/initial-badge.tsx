import type { Profile } from "@/types/app";
import { initials, userName } from "@/lib/format";
import { DELETED_COLORS, assigneeColors } from "@/lib/presets";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const SIZE: Record<"sm" | "md", string> = {
  sm: "size-5 text-[10px]",
  md: "size-6 text-xs",
};

export function InitialBadge({
  profile,
  size = "md",
  className,
}: {
  profile: Profile | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const { mode } = useTheme();
  const colors = profile ? assigneeColors(profile.badge_preset, mode) : DELETED_COLORS[mode];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-medium ring-1 ring-background",
        SIZE[size],
        className
      )}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
      title={userName(profile ?? null)}
      aria-label={userName(profile ?? null)}
    >
      {initials(profile ?? null)}
    </span>
  );
}
