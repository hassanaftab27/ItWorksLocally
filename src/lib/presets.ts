// 16 named presets, ordered as requested:
//   Off White -> Red -> Orange -> Amber -> Yellow -> Yellow-Green -> Green -> Cyan ->
//   Sky Blue -> Blue -> Violet -> Lavender -> Magenta -> Pink -> Slate Gray -> Charcoal.
//
// Two palettes share the same 16 names: assignees get saturated jewel tones
// (white text), categories get lighter pastel tones (dark text). Each preset
// has light + dark UI variants in the same hue family.

export type PresetPair = {
  light: { bg: string; fg: string };
  dark: { bg: string; fg: string };
};

export const ASSIGNEE_PRESETS: Record<string, PresetPair> = {
  offWhite:    { light: { bg: "#f1f5f9", fg: "#0f172a" }, dark: { bg: "#e2e8f0", fg: "#0f172a" } },
  red:         { light: { bg: "#dc2626", fg: "#ffffff" }, dark: { bg: "#ef4444", fg: "#ffffff" } },
  orange:      { light: { bg: "#ea580c", fg: "#ffffff" }, dark: { bg: "#f97316", fg: "#ffffff" } },
  amber:       { light: { bg: "#d97706", fg: "#ffffff" }, dark: { bg: "#f59e0b", fg: "#ffffff" } },
  yellow:      { light: { bg: "#ca8a04", fg: "#ffffff" }, dark: { bg: "#eab308", fg: "#ffffff" } },
  yellowGreen: { light: { bg: "#65a30d", fg: "#ffffff" }, dark: { bg: "#84cc16", fg: "#ffffff" } },
  green:       { light: { bg: "#16a34a", fg: "#ffffff" }, dark: { bg: "#22c55e", fg: "#ffffff" } },
  cyan:        { light: { bg: "#0891b2", fg: "#ffffff" }, dark: { bg: "#06b6d4", fg: "#ffffff" } },
  skyBlue:     { light: { bg: "#0284c7", fg: "#ffffff" }, dark: { bg: "#0ea5e9", fg: "#ffffff" } },
  blue:        { light: { bg: "#2563eb", fg: "#ffffff" }, dark: { bg: "#3b82f6", fg: "#ffffff" } },
  violet:      { light: { bg: "#7c3aed", fg: "#ffffff" }, dark: { bg: "#8b5cf6", fg: "#ffffff" } },
  lavender:    { light: { bg: "#9333ea", fg: "#ffffff" }, dark: { bg: "#a855f7", fg: "#ffffff" } },
  magenta:     { light: { bg: "#c026d3", fg: "#ffffff" }, dark: { bg: "#d946ef", fg: "#ffffff" } },
  pink:        { light: { bg: "#db2777", fg: "#ffffff" }, dark: { bg: "#ec4899", fg: "#ffffff" } },
  slateGray:   { light: { bg: "#475569", fg: "#ffffff" }, dark: { bg: "#64748b", fg: "#ffffff" } },
  charcoal:    { light: { bg: "#1e293b", fg: "#ffffff" }, dark: { bg: "#334155", fg: "#ffffff" } },
};

// Categories: hand-picked soft pastels. Dark variants are slightly deeper /
// more saturated versions so they still read on a dark card without losing
// the pastel character. Dark text in both modes.
export const CATEGORY_PRESETS: Record<string, PresetPair> = {
  white:        { light: { bg: "#FFFFFF", fg: "#1e293b" }, dark: { bg: "#E2E8F0", fg: "#0f172a" } },
  blush:        { light: { bg: "#FFE4E8", fg: "#7f1d1d" }, dark: { bg: "#FBC4CB", fg: "#7f1d1d" } },
  peach:        { light: { bg: "#FFD8B1", fg: "#7c2d12" }, dark: { bg: "#FCB888", fg: "#7c2d12" } },
  butter:       { light: { bg: "#FFF3B0", fg: "#713f12" }, dark: { bg: "#FAE886", fg: "#713f12" } },
  paleYellow:   { light: { bg: "#FAFFA0", fg: "#422006" }, dark: { bg: "#ECF783", fg: "#422006" } },
  mintGreen:    { light: { bg: "#D4F5C4", fg: "#14532d" }, dark: { bg: "#BBE8A4", fg: "#14532d" } },
  seafoam:      { light: { bg: "#B7F5E4", fg: "#134e4a" }, dark: { bg: "#97E5CB", fg: "#134e4a" } },
  babyBlue:     { light: { bg: "#B3ECFF", fg: "#164e63" }, dark: { bg: "#88D9F0", fg: "#164e63" } },
  periwinkle:   { light: { bg: "#C5D8FF", fg: "#1e3a8a" }, dark: { bg: "#A8BFFB", fg: "#1e3a8a" } },
  softLavender: { light: { bg: "#DEC5FF", fg: "#4c1d95" }, dark: { bg: "#C4A6FB", fg: "#4c1d95" } },
  lilac:        { light: { bg: "#F2C5FF", fg: "#581c87" }, dark: { bg: "#DFA5F7", fg: "#581c87" } },
  softPink:     { light: { bg: "#FFC5EE", fg: "#831843" }, dark: { bg: "#FBA7E1", fg: "#831843" } },
  salmonMist:   { light: { bg: "#FFDDD2", fg: "#7f1d1d" }, dark: { bg: "#FAC1AE", fg: "#7f1d1d" } },
  silverMist:   { light: { bg: "#E2E8F0", fg: "#334155" }, dark: { bg: "#C7D2DF", fg: "#1e293b" } },
  coolGray:     { light: { bg: "#CBD5E1", fg: "#1f2937" }, dark: { bg: "#A4B0BD", fg: "#0f172a" } },
  steelGray:    { light: { bg: "#94A3B8", fg: "#1f2937" }, dark: { bg: "#6E7C92", fg: "#f1f5f9" } },
};

export const DEFAULT_ASSIGNEE_PRESET = "blue";
export const DEFAULT_CATEGORY_PRESET = "softLavender";

export function assigneeColors(id: string | null | undefined, mode: "light" | "dark") {
  const key = id && id in ASSIGNEE_PRESETS ? id : DEFAULT_ASSIGNEE_PRESET;
  return ASSIGNEE_PRESETS[key][mode];
}

export function categoryColors(id: string | null | undefined, mode: "light" | "dark") {
  const key = id && id in CATEGORY_PRESETS ? id : DEFAULT_CATEGORY_PRESET;
  return CATEGORY_PRESETS[key][mode];
}

// Neutral fallback for deleted users / missing data.
export const DELETED_COLORS: PresetPair = {
  light: { bg: "#9ca3af", fg: "#ffffff" },
  dark:  { bg: "#4b5563", fg: "#e5e7eb" },
};
