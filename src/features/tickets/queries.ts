import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type {
  Priority,
  Ticket,
  TicketAssignee,
  TicketStatus,
  TicketType,
} from "@/types/app";

export const ticketsKeys = {
  byChannel: (channelId: string) => ["tickets", channelId] as const,
};

// ---- Position computation -------------------------------------------------

const POSITION_GAP = 1000;

export function bisect(prev: number | undefined, next: number | undefined): number {
  if (prev == null && next == null) return Date.now();
  if (prev == null) return (next as number) - POSITION_GAP;
  if (next == null) return (prev as number) + POSITION_GAP;
  return Math.floor((prev + next) / 2);
}

type NeighborInfo = { id: string; position: number } | undefined;

// Failsafe: if the gap between two adjacent positions has shrunk to <= 1,
// midpoint bisection would collide. Call the renumber_column RPC to respace
// the entire column to clean 1000, 2000, 3000... positions, then refetch
// the two neighbor positions so the caller can compute a fresh midpoint.
//
// In the common case (gap > 1) this is a synchronous no-op - it just
// returns the neighbors as-is, no network round-trip.
export async function safeBisect(
  channelId: string,
  status: string,
  prev: NeighborInfo,
  next: NeighborInfo
): Promise<number> {
  if (!prev || !next || next.position - prev.position > 1) {
    return bisect(prev?.position, next?.position);
  }

  // Tight - respace the column.
  const { error: rpcErr } = await supabase.rpc("renumber_column", {
    p_channel_id: channelId,
    p_status: status,
  });
  if (rpcErr) {
    // If the RPC isn't available yet (migration not applied), fall back to
    // best-effort bisect with the stale values.
    console.warn("renumber_column RPC failed, falling back:", rpcErr.message);
    return bisect(prev.position, next.position);
  }

  // Pull the two neighbors' fresh positions.
  const { data, error } = await supabase
    .from("tickets")
    .select("id, position")
    .in("id", [prev.id, next.id]);
  if (error || !data) return bisect(prev.position, next.position);

  const refreshed = new Map(data.map((t) => [t.id as string, t.position as number]));
  return bisect(refreshed.get(prev.id), refreshed.get(next.id));
}

export type TicketsBundle = {
  tickets: Ticket[];
  assignees: TicketAssignee[];
};

export function useChannelTickets(channelId: string | undefined) {
  return useQuery({
    queryKey: channelId ? ticketsKeys.byChannel(channelId) : ["tickets", "__nil__"],
    enabled: !!channelId,
    queryFn: async (): Promise<TicketsBundle> => {
      const { data: tickets, error: tErr } = await supabase
        .from("tickets")
        .select("*")
        .eq("channel_id", channelId!)
        .order("position", { ascending: true });
      if (tErr) throw tErr;

      const ticketIds = (tickets ?? []).map((t) => t.id);
      let assignees: TicketAssignee[] = [];
      if (ticketIds.length) {
        const { data, error } = await supabase
          .from("ticket_assignees")
          .select("*")
          .in("ticket_id", ticketIds);
        if (error) throw error;
        assignees = (data as TicketAssignee[]) ?? [];
      }
      return { tickets: (tickets as Ticket[]) ?? [], assignees };
    },
  });
}

type TicketInput = {
  title: string;
  description?: string | null;
  type: TicketType;
  status: TicketStatus;
  priority: Priority;
  due_date?: string | null;
  category_id?: string | null;
  progress?: number;
  assigneeIds?: string[];
};

export function useCreateTicket(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TicketInput) => {
      const { data: ticket, error } = await supabase
        .from("tickets")
        .insert({
          channel_id: channelId,
          title: input.title,
          description: input.description ?? null,
          type: input.type,
          status: input.status,
          priority: input.priority,
          due_date: input.due_date ?? null,
          category_id: input.category_id ?? null,
          progress: input.progress ?? 0,
          position: Date.now(),
        })
        .select()
        .single();
      if (error) throw error;
      const tid = (ticket as Ticket).id;

      if (input.assigneeIds?.length) {
        const rows = input.assigneeIds.map((uid) => ({ ticket_id: tid, user_id: uid }));
        const { error: aErr } = await supabase.from("ticket_assignees").insert(rows);
        if (aErr) throw aErr;
      }
      return ticket as Ticket;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketsKeys.byChannel(channelId) }),
  });
}

type TicketUpdate = {
  id: string;
  title?: string;
  description?: string | null;
  type?: TicketType;
  status?: TicketStatus;
  priority?: Priority;
  due_date?: string | null;
  category_id?: string | null;
  progress?: number;
  position?: number;
  assigneeIds?: string[];
};

export function useUpdateTicket(channelId: string) {
  const qc = useQueryClient();
  const queryKey = ticketsKeys.byChannel(channelId);
  return useMutation({
    // Apply the patch to the React Query cache immediately so the UI moves
    // before the network call lands. Roll back if the request fails.
    onMutate: async (input: TicketUpdate) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<TicketsBundle>(queryKey);
      qc.setQueryData<TicketsBundle>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          tickets: old.tickets.map((t) => {
            if (t.id !== input.id) return t;
            return {
              ...t,
              ...(input.title !== undefined && { title: input.title }),
              ...(input.description !== undefined && { description: input.description }),
              ...(input.type !== undefined && { type: input.type }),
              ...(input.status !== undefined && { status: input.status }),
              ...(input.priority !== undefined && { priority: input.priority }),
              ...(input.due_date !== undefined && { due_date: input.due_date }),
              ...(input.category_id !== undefined && { category_id: input.category_id }),
              ...(input.progress !== undefined && { progress: input.progress }),
              ...(input.position !== undefined && { position: input.position }),
            };
          }),
        };
      });
      return { prev };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    },
    mutationFn: async (input: TicketUpdate) => {
      const patch: Record<string, unknown> = {};
      if (input.title !== undefined) patch.title = input.title;
      if (input.description !== undefined) patch.description = input.description;
      if (input.type !== undefined) patch.type = input.type;
      if (input.status !== undefined) patch.status = input.status;
      if (input.priority !== undefined) patch.priority = input.priority;
      if (input.due_date !== undefined) patch.due_date = input.due_date;
      if (input.category_id !== undefined) patch.category_id = input.category_id;
      if (input.progress !== undefined) patch.progress = input.progress;
      if (input.position !== undefined) patch.position = input.position;

      if (Object.keys(patch).length) {
        const { error } = await supabase.from("tickets").update(patch).eq("id", input.id);
        if (error) throw error;
      }

      if (input.assigneeIds) {
        const { error: delErr } = await supabase
          .from("ticket_assignees")
          .delete()
          .eq("ticket_id", input.id);
        if (delErr) throw delErr;
        if (input.assigneeIds.length) {
          const rows = input.assigneeIds.map((uid) => ({
            ticket_id: input.id,
            user_id: uid,
          }));
          const { error: insErr } = await supabase.from("ticket_assignees").insert(rows);
          if (insErr) throw insErr;
        }
      }
    },
  });
}

// Fetch all tickets where the given user is assigned. Returns the tickets
// plus the full set of assignees for those tickets and the channels they
// belong to (so we can render channel names + sibling-assignee badges).
export type MyTicketsBundle = {
  tickets: Ticket[];
  assignees: TicketAssignee[];
  channels: { id: string; name: string }[];
};

export function useMyTickets(userId: string | undefined) {
  return useQuery({
    queryKey: ["my-tickets", userId ?? "__nil__"],
    enabled: !!userId,
    queryFn: async (): Promise<MyTicketsBundle> => {
      const { data: rows, error } = await supabase
        .from("ticket_assignees")
        .select("ticket_id")
        .eq("user_id", userId!);
      if (error) throw error;
      const ticketIds = Array.from(new Set((rows ?? []).map((r) => r.ticket_id)));
      if (ticketIds.length === 0) {
        return { tickets: [], assignees: [], channels: [] };
      }

      const [ticketsRes, assigneesRes] = await Promise.all([
        supabase.from("tickets").select("*").in("id", ticketIds),
        supabase.from("ticket_assignees").select("*").in("ticket_id", ticketIds),
      ]);
      if (ticketsRes.error) throw ticketsRes.error;
      if (assigneesRes.error) throw assigneesRes.error;

      const tickets = (ticketsRes.data ?? []) as Ticket[];
      const assignees = (assigneesRes.data ?? []) as TicketAssignee[];
      const channelIds = Array.from(new Set(tickets.map((t) => t.channel_id)));
      const { data: channels, error: cErr } = await supabase
        .from("channels")
        .select("id, name")
        .in("id", channelIds);
      if (cErr) throw cErr;
      return { tickets, assignees, channels: channels ?? [] };
    },
  });
}

export function useDeleteTicket(channelId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ticketsKeys.byChannel(channelId) }),
  });
}
