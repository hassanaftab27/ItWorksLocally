import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { profilesKeys } from "@/features/profiles/queries";
import type { Role } from "@/types/app";

type AdminOpsBody =
  | { op: "create_user"; email: string; full_name?: string; role: Role }
  | { op: "delete_user"; user_id: string };

async function invokeAdminOps<T>(body: AdminOpsBody): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("admin-ops", { body });
  if (error) throw error;
  return data as T;
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; full_name?: string; role: Role }) =>
      invokeAdminOps<{ user_id: string }>({ op: "create_user", ...input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: profilesKeys.all }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (user_id: string) =>
      invokeAdminOps<{ ok: true }>({ op: "delete_user", user_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: profilesKeys.all });
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}
