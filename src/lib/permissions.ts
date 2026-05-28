// Client-side UI gating only - RLS is the source of truth.
// These helpers decide which buttons to show, not what the DB actually allows.

import type { Profile } from "@/types/app";

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin";
}

export function isChannelMember(
  profile: Profile | null | undefined,
  channelMemberIds: Set<string>
): boolean {
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return channelMemberIds.has(profile.id);
}

export function canCreateTicket(
  profile: Profile | null | undefined,
  channelMemberIds: Set<string>
): boolean {
  return isChannelMember(profile, channelMemberIds);
}

export function canEditTicket(
  profile: Profile | null | undefined,
  channelMemberIds: Set<string>
): boolean {
  return isChannelMember(profile, channelMemberIds);
}

export function canDeleteTicket(profile: Profile | null | undefined): boolean {
  return isAdmin(profile);
}
