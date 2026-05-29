import type { Profile } from "@/types/app";

export const DELETED_USER = "Deleted User";

export function userName(profile: Pick<Profile, "full_name" | "email"> | null | undefined): string {
  if (!profile) return DELETED_USER;
  return profile.full_name?.trim() || profile.email;
}

export function userById(
  id: string | null | undefined,
  profiles: Map<string, Profile> | Record<string, Profile>
): string {
  if (!id) return DELETED_USER;
  const p = profiles instanceof Map ? profiles.get(id) : profiles[id];
  return userName(p);
}

export function initials(
  profile: Pick<Profile, "full_name" | "email"> | null | undefined
): string {
  if (!profile) return "?";
  const source = (profile.full_name?.trim() || profile.email || "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

export const DELETED_BADGE_BG = "#9ca3af";
export const DELETED_BADGE_FG = "#ffffff";

// "3d", "5h", "20m" for upcoming; "3d ago", "5h ago" for past; "now" when within a minute.
export function dueRelative(iso: string | null | undefined): string {
  if (!iso) return "";
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return "";
  const diffMs = due - Date.now();
  const absMs = Math.abs(diffMs);
  const days = Math.floor(absMs / 86_400_000);
  const hours = Math.floor(absMs / 3_600_000);
  const mins = Math.floor(absMs / 60_000);
  let label: string;
  if (days >= 1) label = `${days}d`;
  else if (hours >= 1) label = `${hours}h`;
  else if (mins >= 1) label = `${mins}m`;
  else return "now";
  return diffMs >= 0 ? label : `${label} ago`;
}

// Convert a stored timestamp to the value a <input type="datetime-local">
// expects (local time, "YYYY-MM-DDTHH:mm").
export function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // Snap to the nearest 30 minutes so the value is valid for the 30-min picker
  // (an off-step value would mark the input invalid and block form submit).
  const step = 30 * 60 * 1000;
  const snapped = new Date(Math.round(d.getTime() / step) * step);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${snapped.getFullYear()}-${pad(snapped.getMonth() + 1)}-${pad(
    snapped.getDate()
  )}T${pad(snapped.getHours())}:${pad(snapped.getMinutes())}`;
}

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  const diff = (Date.now() - then) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604_800) return `${Math.floor(diff / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
