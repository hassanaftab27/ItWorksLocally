import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/types/app";

export const profilesKeys = {
  all: ["profiles"] as const,
};

export function useProfiles() {
  return useQuery({
    queryKey: profilesKeys.all,
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as Profile[]) ?? [];
    },
    staleTime: 60_000,
  });
}

export function useProfilesMap() {
  const q = useProfiles();
  const map = new Map<string, Profile>();
  for (const p of q.data ?? []) map.set(p.id, p);
  return { ...q, map };
}
