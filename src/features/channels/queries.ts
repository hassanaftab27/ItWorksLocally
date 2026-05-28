import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Channel, ChannelMember, Profile } from "@/types/app";

export const channelsKeys = {
  all: ["channels"] as const,
  byName: (name: string) => ["channels", "name", name] as const,
  members: (channelId: string) => ["channels", channelId, "members"] as const,
};

export function useChannels() {
  return useQuery({
    queryKey: channelsKeys.all,
    queryFn: async (): Promise<Channel[]> => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Channel[];
    },
  });
}

export function useChannelByName(name: string | undefined) {
  return useQuery({
    queryKey: name ? channelsKeys.byName(name) : ["channels", "name", "__nil__"],
    enabled: !!name,
    queryFn: async (): Promise<Channel | null> => {
      const { data, error } = await supabase
        .from("channels")
        .select("*")
        .eq("name", name!)
        .maybeSingle();
      if (error) throw error;
      return (data as Channel) ?? null;
    },
  });
}

export function useChannelMembers(channelId: string | undefined) {
  return useQuery({
    queryKey: channelId ? channelsKeys.members(channelId) : ["channels", "__nil__", "members"],
    enabled: !!channelId,
    queryFn: async (): Promise<{ members: ChannelMember[]; profiles: Profile[] }> => {
      const { data: members, error: mErr } = await supabase
        .from("channel_members")
        .select("*")
        .eq("channel_id", channelId!);
      if (mErr) throw mErr;

      const userIds = (members ?? []).map((m) => m.user_id);
      let profiles: Profile[] = [];
      if (userIds.length) {
        const { data: ps, error: pErr } = await supabase
          .from("profiles")
          .select("*")
          .in("id", userIds);
        if (pErr) throw pErr;
        profiles = (ps as Profile[]) ?? [];
      }
      return { members: (members as ChannelMember[]) ?? [], profiles };
    },
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string | null }) => {
      const { data, error } = await supabase
        .from("channels")
        .insert({
          name: input.name.toLowerCase().trim(),
          description: input.description ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Channel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: channelsKeys.all }),
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string | null }) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.name = input.name.toLowerCase().trim();
      if (input.description !== undefined) patch.description = input.description;
      const { data, error } = await supabase
        .from("channels")
        .update(patch)
        .eq("id", input.id)
        .select()
        .single();
      if (error) throw error;
      return data as Channel;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: channelsKeys.all }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("channels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: channelsKeys.all }),
  });
}

export function useAddChannelMember(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("channel_members")
        .insert({ channel_id: channelId, user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: channelsKeys.members(channelId) }),
  });
}

export function useRemoveChannelMember(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: channelsKeys.members(channelId) });
      // assignees cascade - refresh tickets too
      qc.invalidateQueries({ queryKey: ["tickets", channelId] });
    },
  });
}
