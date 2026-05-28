import type { TicketStatus } from "@/types/app";

export const STATUSES: readonly TicketStatus[] = [
  "work",
  "working",
  "working_q",
  "works_locally",
  "works_everywhere",
] as const;

export const STATUS_LABELS: Record<TicketStatus, string> = {
  work: "Work!",
  working: "Working",
  working_q: "Working?",
  works_locally: "Works Locally",
  works_everywhere: "Works Everywhere",
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  work: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  working: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200",
  working_q: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  works_locally: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200",
  works_everywhere: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
};
