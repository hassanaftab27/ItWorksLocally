import { useMemo, useState } from "react";
import { Bug, CheckSquare, Clock, GripVertical } from "lucide-react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type {
  Category,
  Priority,
  Profile,
  Ticket,
  TicketAssignee,
  TicketStatus,
} from "@/types/app";
import { STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statuses";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/priorities";
import { dueRelative } from "@/lib/format";
import { categoryColors } from "@/lib/presets";
import { useTheme } from "@/lib/theme";
import { InitialBadge } from "@/components/ui/initial-badge";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { Battery } from "@/components/ui/battery";
import { ColumnFilter } from "@/components/ui/column-filter";
import { safeBisect, useUpdateTicket } from "@/features/tickets/queries";
import { cn } from "@/lib/utils";

type Props = {
  channelId: string;
  tickets: Ticket[];
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  onTicketClick: (t: Ticket) => void;
};

// Responsive cell classes - shared so headers and rows stay in lockstep.
const TYPE_CELL = "hidden px-2 md:table-cell";
const LG_CELL = "hidden px-2 lg:table-cell";

export function ListView({
  channelId,
  tickets,
  assignees,
  profilesMap,
  categoriesMap,
  onTicketClick,
}: Props) {
  const { mode } = useTheme();
  const updateMut = useUpdateTicket(channelId);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );
  const [selected, setSelected] = useState<Set<TicketStatus>>(new Set(STATUSES));

  const grouped = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      work: [],
      working: [],
      working_q: [],
      works_locally: [],
      works_everywhere: [],
    };
    for (const t of tickets) {
      map[t.status as TicketStatus].push(t);
    }
    for (const s of STATUSES) {
      map[s].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tickets]);

  const visibleGroups = STATUSES.filter((s) => selected.has(s));

  function toggleFilter(s: TicketStatus) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId || activeId === overId) return;
    const activeTicket = tickets.find((t) => t.id === activeId);
    const overTicket = tickets.find((t) => t.id === overId);
    if (!activeTicket || !overTicket) return;
    if (activeTicket.status !== overTicket.status) return;

    const status = activeTicket.status as TicketStatus;
    const items = grouped[status];
    const oldIdx = items.findIndex((t) => t.id === activeId);
    const newIdx = items.findIndex((t) => t.id === overId);
    if (oldIdx < 0 || newIdx < 0) return;

    const reordered = arrayMove(items, oldIdx, newIdx);
    const prev = reordered[newIdx - 1];
    const next = reordered[newIdx + 1];
    void (async () => {
      const newPos = await safeBisect(channelId, status, prev, next);
      updateMut.mutate({ id: activeId, position: newPos });
    })();
  }

  return (
    <div className="flex h-full flex-col">
      <ColumnFilter
        selected={selected}
        onToggle={toggleFilter}
        className="shrink-0 border-b px-4 py-2"
      />

      <div className="flex-1 overflow-auto">
        {visibleGroups.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Pick at least one column above.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <div className="space-y-6 p-4">
              {visibleGroups.map((status) => {
                const items = grouped[status];
                return (
                  <section key={status}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 text-xs font-semibold",
                          STATUS_COLORS[status]
                        )}
                      >
                        {STATUS_LABELS[status]}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {items.length}
                      </span>
                    </div>
                    {items.length === 0 ? (
                      <div className="rounded-md border p-4 text-sm text-muted-foreground">
                        Nothing here.
                      </div>
                    ) : (
                      <div className="rounded-md border">
                        <table className="w-full table-fixed text-sm">
                          <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="w-8" />
                              <th className={cn("w-12 py-2", TYPE_CELL)}>Type</th>
                              <th className="px-2 py-2">Title</th>
                              <th className={cn("w-32 py-2", LG_CELL)}>Priority</th>
                              <th className={cn("w-32 py-2", LG_CELL)}>Category</th>
                              <th className={cn("w-24 py-2", LG_CELL)}>Progress</th>
                              <th className={cn("w-24 py-2", LG_CELL)}>Due</th>
                              <th className="w-24 px-2 py-2">Assignees</th>
                            </tr>
                          </thead>
                          <SortableContext
                            items={items.map((t) => t.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <tbody>
                              {items.map((t) => (
                                <SortableRow
                                  key={t.id}
                                  ticket={t}
                                  assignees={assignees}
                                  profilesMap={profilesMap}
                                  categoriesMap={categoriesMap}
                                  mode={mode}
                                  onTicketClick={onTicketClick}
                                />
                              ))}
                            </tbody>
                          </SortableContext>
                        </table>
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function SortableRow({
  ticket,
  assignees,
  profilesMap,
  categoriesMap,
  mode,
  onTicketClick,
}: {
  ticket: Ticket;
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  mode: "light" | "dark";
  onTicketClick: (t: Ticket) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: ticket.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const tAssignees = assignees.filter((a) => a.ticket_id === ticket.id);
  const priority = (ticket.priority as Priority) ?? "medium";
  const category = ticket.category_id ? categoriesMap.get(ticket.category_id) : null;
  const progress = Math.max(0, Math.min(100, ticket.progress ?? 0));
  return (
    <tr
      ref={setNodeRef}
      style={style}
      onClick={() => onTicketClick(ticket)}
      className={cn(
        "cursor-pointer border-b last:border-b-0 hover:bg-accent/40",
        isDragging && "opacity-40"
      )}
    >
      <td
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="w-8 cursor-grab touch-none px-2 text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-4" />
      </td>
      <td className={cn("py-2", TYPE_CELL)}>
        {ticket.type === "bug" ? (
          <Bug className="size-4 text-rose-500 dark:text-rose-400" />
        ) : (
          <CheckSquare className="size-4 text-sky-500 dark:text-sky-400" />
        )}
      </td>
      <td className="truncate px-2 py-2 font-medium">{ticket.title}</td>
      <td className={cn("py-2", LG_CELL)}>
        <span className="inline-flex items-center gap-1">
          <PriorityIcon
            priority={priority}
            className={cn("h-4 w-4", PRIORITY_COLORS[priority])}
          />
          <span className="text-xs">{PRIORITY_LABELS[priority]}</span>
        </span>
      </td>
      <td className={cn("py-2", LG_CELL)}>
        {category ? (
          (() => {
            const colors = categoryColors(category.preset, mode);
            return (
              <span
                className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: colors.bg, color: colors.fg }}
              >
                {category.name}
              </span>
            );
          })()
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className={cn("py-2", LG_CELL)}>
        <Battery value={progress} />
      </td>
      <td className={cn("py-2", LG_CELL)}>
        {ticket.due_date ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {dueRelative(ticket.due_date)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </td>
      <td className="px-2 py-2">
        {tAssignees.length === 0 ? (
          <span className="text-xs text-muted-foreground">-</span>
        ) : (
          <div className="flex -space-x-1">
            {tAssignees.map((a) => (
              <InitialBadge
                key={a.user_id}
                profile={profilesMap.get(a.user_id) ?? null}
                size="sm"
              />
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
