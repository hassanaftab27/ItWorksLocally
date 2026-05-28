import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUSES, STATUS_LABELS, STATUS_COLORS } from "@/lib/statuses";
import type {
  Category,
  Profile,
  Ticket,
  TicketAssignee,
  TicketStatus,
} from "@/types/app";
import { TicketCard } from "./TicketCard";
import { safeBisect, useUpdateTicket } from "@/features/tickets/queries";
import { cn } from "@/lib/utils";

const COLUMN_WIDTH_PX = 288;
const COLLAPSED_WIDTH_PX = 44;

const TICKET_DROP_PREFIX = "before:";

type Props = {
  channelId: string;
  tickets: Ticket[];
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  canEdit: boolean;
  onTicketClick: (ticket: Ticket) => void;
};

export function KanbanView({
  channelId,
  tickets,
  assignees,
  profilesMap,
  categoriesMap,
  canEdit,
  onTicketClick,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const updateMut = useUpdateTicket(channelId);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<TicketStatus>>(new Set());

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

  const activeTicket = useMemo(
    () => (activeId ? tickets.find((t) => t.id === activeId) ?? null : null),
    [activeId, tickets]
  );

  function toggleCollapsed(s: TicketStatus) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const activeIdStr = String(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    if (!overId) return;

    const activeTicket = tickets.find((t) => t.id === activeIdStr);
    if (!activeTicket) return;

    let targetStatus: TicketStatus;
    let prev: { id: string; position: number } | undefined;
    let next: { id: string; position: number } | undefined;

    if (overId.startsWith(TICKET_DROP_PREFIX)) {
      // Drop above a specific ticket -> insert before it in that ticket's column.
      const beforeId = overId.slice(TICKET_DROP_PREFIX.length);
      if (beforeId === activeIdStr) return;
      const beforeTicket = tickets.find((t) => t.id === beforeId);
      if (!beforeTicket) return;
      targetStatus = beforeTicket.status as TicketStatus;
      const colTickets = grouped[targetStatus].filter((t) => t.id !== activeIdStr);
      const idx = colTickets.findIndex((t) => t.id === beforeId);
      prev = idx > 0 ? colTickets[idx - 1] : undefined;
      next = beforeTicket;
    } else {
      // Drop on a column body -> append.
      targetStatus = overId as TicketStatus;
      const colTickets = grouped[targetStatus].filter((t) => t.id !== activeIdStr);
      prev = colTickets[colTickets.length - 1];
      next = undefined;
    }

    void (async () => {
      const newPosition = await safeBisect(channelId, targetStatus, prev, next);
      if (
        activeTicket.status === targetStatus &&
        activeTicket.position === newPosition
      ) {
        return;
      }
      updateMut.mutate({
        id: activeIdStr,
        status: targetStatus,
        position: newPosition,
      });
    })();
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto p-3">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tickets={grouped[status]}
            assignees={assignees}
            profilesMap={profilesMap}
            categoriesMap={categoriesMap}
            canDrag={canEdit}
            isCollapsed={collapsed.has(status)}
            onToggleCollapsed={() => toggleCollapsed(status)}
            widthPx={collapsed.has(status) ? COLLAPSED_WIDTH_PX : COLUMN_WIDTH_PX}
            activeId={activeId}
            onTicketClick={onTicketClick}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTicket ? (
          <div
            style={{ width: COLUMN_WIDTH_PX }}
            className="rotate-2 cursor-grabbing opacity-95 shadow-xl"
          >
            <TicketCard
              ticket={activeTicket}
              assignees={assignees}
              profilesMap={profilesMap}
              categoriesMap={categoriesMap}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({
  status,
  tickets,
  assignees,
  profilesMap,
  categoriesMap,
  canDrag,
  isCollapsed,
  onToggleCollapsed,
  widthPx,
  activeId,
  onTicketClick,
}: {
  status: TicketStatus;
  tickets: Ticket[];
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  canDrag: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  widthPx: number;
  activeId: string | null;
  onTicketClick: (t: Ticket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      style={{ width: widthPx }}
      className={cn(
        "flex h-full shrink-0 flex-col rounded-md border bg-card transition-[width] duration-150",
        isOver && "ring-2 ring-primary"
      )}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={`Expand ${STATUS_LABELS[status]}`}
          aria-label={`Expand ${STATUS_LABELS[status]} column`}
          className="flex h-full w-full flex-col items-center gap-2 py-3 hover:bg-accent/40"
        >
          <ChevronRight className="size-4 text-muted-foreground" />
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[10px] font-medium",
              STATUS_COLORS[status]
            )}
          >
            {tickets.length}
          </span>
          <span
            className="mt-1 text-xs font-medium text-muted-foreground"
            style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          >
            {STATUS_LABELS[status]}
          </span>
        </button>
      ) : (
        <>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-2 py-2">
            <span
              className={cn(
                "truncate rounded px-2 py-0.5 text-xs font-medium",
                STATUS_COLORS[status]
              )}
            >
              {STATUS_LABELS[status]}
            </span>
            <div className="flex shrink-0 items-center gap-1">
              <span className="text-xs text-muted-foreground">{tickets.length}</span>
              <button
                type="button"
                onClick={onToggleCollapsed}
                title="Collapse column"
                aria-label={`Collapse ${STATUS_LABELS[status]} column`}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {tickets.map((t) => (
              <DraggableTicket
                key={t.id}
                ticket={t}
                assignees={assignees}
                profilesMap={profilesMap}
                categoriesMap={categoriesMap}
                disabled={!canDrag}
                isAnotherDragging={!!activeId && activeId !== t.id}
                onClick={() => onTicketClick(t)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function DraggableTicket({
  ticket,
  assignees,
  profilesMap,
  categoriesMap,
  disabled,
  isAnotherDragging,
  onClick,
}: {
  ticket: Ticket;
  assignees: TicketAssignee[];
  profilesMap: Map<string, Profile>;
  categoriesMap: Map<string, Category>;
  disabled: boolean;
  isAnotherDragging: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef: dragRef, isDragging } = useDraggable({
    id: ticket.id,
    disabled,
  });
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `${TICKET_DROP_PREFIX}${ticket.id}`,
    disabled: disabled || isDragging,
  });

  const showInsertLine = isOver && isAnotherDragging;

  return (
    <div ref={dropRef}>
      {showInsertLine && (
        <div className="mb-1 h-0.5 rounded bg-primary" aria-hidden />
      )}
      <div
        ref={dragRef}
        {...(disabled ? {} : { ...listeners, ...attributes })}
        className={cn(isDragging && "opacity-30")}
      >
        <TicketCard
          ticket={ticket}
          assignees={assignees}
          profilesMap={profilesMap}
          categoriesMap={categoriesMap}
          onClick={onClick}
        />
      </div>
    </div>
  );
}
