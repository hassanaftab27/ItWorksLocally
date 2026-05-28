// Hand-written aliases on top of the auto-generated `db.ts`.
// `db.ts` is overwritten by `npm run db:types`, so anything in here is safe.

import type { Tables } from "./db";

export type Channel = Tables<"channels">;
export type ChannelMember = Tables<"channel_members">;
export type TicketAssignee = Tables<"ticket_assignees">;

// Hand-extended until `npm run db:types` re-runs against the latest schema.
export type Profile = Omit<Tables<"profiles">, "badge_bg_color" | "badge_fg_color"> & {
  badge_preset: string;
};

export type Category = {
  id: string;
  name: string;
  preset: string;
  created_at: string;
  created_by: string | null;
};

export type Ticket = Tables<"tickets"> & {
  category_id: string | null;
  progress: number;
};

export type Role = "admin" | "member";
export type TicketType = "task" | "bug";
export type TicketStatus =
  | "work"
  | "working"
  | "working_q"
  | "works_locally"
  | "works_everywhere";
export type Priority = "low" | "medium" | "high" | "critical";
