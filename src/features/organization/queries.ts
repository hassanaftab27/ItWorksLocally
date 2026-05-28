import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const BUCKET = "branding";
const LOGO_PATH = "company-logo";

export const organizationKeys = {
  current: ["organization"] as const,
};

export type Organization = {
  id: number;
  logo_path: string | null;
  updated_at: string;
};

export function useOrganization() {
  return useQuery({
    queryKey: organizationKeys.current,
    queryFn: async (): Promise<Organization | null> => {
      const { data, error } = await supabase
        .from("organization")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return (data as Organization) ?? null;
    },
    staleTime: 60_000,
  });
}

// Public URL for the stored logo, with a cache-busting query so a re-upload to
// the same path is picked up immediately.
export function organizationLogoUrl(org: Organization | null | undefined): string | null {
  if (!org?.logo_path) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(org.logo_path);
  return `${data.publicUrl}?t=${encodeURIComponent(org.updated_at)}`;
}

export function useUploadOrgLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(LOGO_PATH, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { error: updErr } = await supabase
        .from("organization")
        .update({ logo_path: LOGO_PATH, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (updErr) throw updErr;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.current }),
  });
}

export function useRemoveOrgLogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await supabase.storage.from(BUCKET).remove([LOGO_PATH]);
      const { error } = await supabase
        .from("organization")
        .update({ logo_path: null, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: organizationKeys.current }),
  });
}
