import { Bug, CheckSquare, Clock } from "lucide-react";
import type {
  Category,
  Priority,
  Profile,
  Ticket,
  TicketAssignee,
} from "@/types/app";
import { InitialBadge } from "@/components/ui/initial-badge";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { Battery } from "@/components/ui/battery";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/priorities";
import { dueRelative } from "@/lib/format";
import { categoryColors } from "@/lib/presets";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  ticket: Ticket;
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  onClick?: () => void;
};

export function TicketCard({
  ticket,
  assignees,
  profilesMap,
  categoriesMap,
  onClick,
}: Props) {
  const { mode } = useTheme();
  const tAssignees = assignees.filter((a) => a.ticket_id === ticket.id);
  const priority = (ticket.priority as Priority) ?? "medium";
  const progress = Math.max(0, Math.min(100, ticket.progress ?? 0));
  const category = ticket.category_id ? categoriesMap.get(ticket.category_id) : null;
  const catColors = category ? categoryColors(category.preset, mode) : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-md border bg-background p-3 text-left shadow-sm transition hover:border-primary/40 hover:shadow"
    >
      {/* Category accent: full-width stripe across the top */}
      {category && catColors && (
        <div
          className="absolute inset-x-0 top-0 h-1.5"
          style={{ backgroundColor: catColors.bg }}
          title={category.name}
          aria-label={`Category: ${category.name}`}
        />
      )}

      {/* Line 1: type icon + title */}
      <div className={cn("flex items-start gap-2", category && "mt-1")}>
        {ticket.type === "bug" ? (
          <Bug className="mt-0.5 size-4 shrink-0 text-rose-500 dark:text-rose-400" />
        ) : (
          <CheckSquare className="mt-0.5 size-4 shrink-0 text-sky-500 dark:text-sky-400" />
        )}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-1 text-sm font-medium">{ticket.title}</div>
        </div>
      </div>

      {/* Line 2: priority signal, battery, due */}
      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <PriorityIcon
          priority={priority}
          className={cn("h-4 w-4", PRIORITY_COLORS[priority])}
          aria-label={`${PRIORITY_LABELS[priority]} priority`}
        />
        <Battery value={progress} />
        {ticket.due_date && (
          <span className="ml-auto flex shrink-0 items-center gap-1 text-muted-foreground">
            <Clock className="size-3" />
            <span>{dueRelative(ticket.due_date)}</span>
          </span>
        )}
      </div>

      {/* Line 3: assignees */}
      {tAssignees.length > 0 && (
        <div className="mt-2 flex -space-x-1">
          {tAssignees.map((a) => (
            <InitialBadge
              key={a.user_id}
              profile={profilesMap.get(a.user_id) ?? null}
              size="md"
            />
          ))}
        </div>
      )}
    </button>
  );
}

