import { Check, ChevronDown, Columns3, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statuses";
import type { TicketStatus } from "@/types/app";
import { cn } from "@/lib/utils";

// Full-width filter bar. The "Filter" icon + label is a non-clickable
// section header - the actual selector is the "Columns" dropdown next to
// it. More filter dropdowns can be added on the same row in the future.
// All text labels collapse to icons below the `sm` breakpoint.
export function ColumnFilter({
  selected,
  onToggle,
  className,
}: {
  selected: Set<TicketStatus>;
  onToggle: (s: TicketStatus) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full items-center gap-3", className)}>
      <span
        className="inline-flex select-none items-center gap-1.5 text-sm font-medium text-muted-foreground"
        aria-hidden
      >
        <Filter className="size-4" />
        <span className="hidden sm:inline">Filter</span>
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm font-medium shadow-sm transition hover:bg-accent"
            aria-label="Filter columns"
          >
            <Columns3 className="size-4" />
            <span className="hidden sm:inline">
              Columns ({selected.size}/{STATUSES.length})
            </span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[12rem]">
          {STATUSES.map((s) => {
            const on = selected.has(s);
            return (
              <DropdownMenuItem
                key={s}
                onSelect={(e) => {
                  e.preventDefault();
                  onToggle(s);
                }}
                className="gap-2"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input"
                  )}
                >
                  {on && <Check className="size-3" />}
                </span>
                <span
                  className={cn(
                    "inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium",
                    STATUS_COLORS[s]
                  )}
                >
                  {STATUS_LABELS[s]}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
