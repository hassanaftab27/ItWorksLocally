import type { PresetPair } from "@/lib/presets";
import { SplitBadge } from "@/components/ui/split-badge";
import { cn } from "@/lib/utils";

// Grid of 32 diagonal-split swatches. Each swatch shows the light variant on
// the top-left and the dark variant on the bottom-right, so the user can pick
// knowing exactly how the preset reads in both themes.
export function PresetPicker({
  presets,
  value,
  onChange,
  disabled,
}: {
  presets: Record<string, PresetPair>;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const ids = Object.keys(presets);
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {ids.map((id) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            title={id}
            aria-label={id}
            aria-pressed={selected}
            className={cn(
              "relative inline-flex items-center justify-center rounded-full transition",
              selected && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
              disabled && "opacity-50"
            )}
          >
            <SplitBadge colors={presets[id]} size="sm" />
          </button>
        );
      })}
    </div>
  );
}
