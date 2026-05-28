import { useMemo, useState } from "react";
import { Bug, CheckSquare, Clock } from "lucide-react";
import { useSession } from "@/features/auth/SessionProvider";
import { useMyTickets } from "@/features/tickets/queries";
import { useChannelMembers } from "@/features/channels/queries";
import { useProfilesMap } from "@/features/profiles/queries";
import { useCategories } from "@/features/categories/queries";
import { STATUSES, STATUS_COLORS, STATUS_LABELS } from "@/lib/statuses";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/priorities";
import { dueRelative } from "@/lib/format";
import { categoryColors } from "@/lib/presets";
import { isAdmin } from "@/lib/permissions";
import { useTheme } from "@/lib/theme";
import { PriorityIcon } from "@/components/ui/priority-icon";
import { Battery } from "@/components/ui/battery";
import { ColumnFilter } from "@/components/ui/column-filter";
import { TicketModal } from "@/components/channel/TicketModal";
import { cn } from "@/lib/utils";
import type { Category, Priority, Profile, Ticket, TicketStatus } from "@/types/app";

const DEFAULT_FILTER: TicketStatus[] = ["work", "working", "working_q"];

// Same responsive cell rules as the channel list view.
const TYPE_CELL = "hidden px-2 md:table-cell";
const LG_CELL = "hidden px-2 lg:table-cell";

export function HomePage() {
  const { profile } = useSession();
  const { mode } = useTheme();
  const { data: myData, isLoading } = useMyTickets(profile?.id);
  const profilesQ = useProfilesMap();
  const { data: categories = [] } = useCategories();

  const [selected, setSelected] = useState<Set<TicketStatus>>(new Set(DEFAULT_FILTER));
  const [openTicket, setOpenTicket] = useState<Ticket | null>(null);

  // Members of the opened ticket's channel, so the assignee picker is populated
  // when editing. Being assigned to a ticket guarantees channel membership, so
  // the user can always edit (delete stays admin-only).
  const membersQ = useChannelMembers(openTicket?.channel_id);
  const assignablePool: Profile[] = useMemo(() => {
    const explicit = membersQ.data?.profiles ?? [];
    const admins = (profilesQ.data ?? []).filter((p) => p.role === "admin");
    const byId = new Map<string, Profile>();
    for (const p of [...explicit, ...admins]) byId.set(p.id, p);
    return Array.from(byId.values()).sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email)
    );
  }, [membersQ.data, profilesQ.data]);

  const categoriesMap = useMemo(() => {
    const m = new Map<string, Category>();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const channelsMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of myData?.channels ?? []) m.set(c.id, c.name);
    return m;
  }, [myData?.channels]);

  const grouped = useMemo(() => {
    const map: Record<TicketStatus, Ticket[]> = {
      work: [],
      working: [],
      working_q: [],
      works_locally: [],
      works_everywhere: [],
    };
    for (const t of myData?.tickets ?? []) {
      const s = t.status as TicketStatus;
      if (selected.has(s)) map[s].push(t);
    }
    for (const s of STATUSES) {
      map[s].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [myData?.tickets, selected]);

  const openInitialAssigneeIds = openTicket
    ? (myData?.assignees ?? [])
        .filter((a) => a.ticket_id === openTicket.id)
        .map((a) => a.user_id)
    : [];

  function toggle(s: TicketStatus) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const visibleGroups = STATUSES.filter((s) => selected.has(s));

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="truncate text-lg font-semibold">My Tasks</h2>
      </div>

      <div className="shrink-0 border-b px-4 py-2">
        <ColumnFilter selected={selected} onToggle={toggle} />
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
            Pick at least one column above.
          </div>
        ) : (
          <div className="space-y-6">
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
                            <th className={cn("w-12 py-2", TYPE_CELL)}>Type</th>
                            <th className="px-2 py-2">Title</th>
                            <th className={cn("w-32 py-2", LG_CELL)}>Priority</th>
                            <th className={cn("w-32 py-2", LG_CELL)}>Category</th>
                            <th className={cn("w-24 py-2", LG_CELL)}>Progress</th>
                            <th className={cn("w-24 py-2", LG_CELL)}>Due</th>
                            <th className="w-32 px-2 py-2">Channel</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((t) => {
                            const priority = (t.priority as Priority) ?? "medium";
                            const progress = Math.max(
                              0,
                              Math.min(100, t.progress ?? 0)
                            );
                            const category = t.category_id
                              ? categoriesMap.get(t.category_id)
                              : null;
                            const channelName = channelsMap.get(t.channel_id);
                            return (
                              <tr
                                key={t.id}
                                onClick={() => setOpenTicket(t)}
                                className="cursor-pointer border-b last:border-b-0 hover:bg-accent/40"
                              >
                                <td className={cn("py-2", TYPE_CELL)}>
                                  {t.type === "bug" ? (
                                    <Bug className="size-4 text-rose-500 dark:text-rose-400" />
                                  ) : (
                                    <CheckSquare className="size-4 text-sky-500 dark:text-sky-400" />
                                  )}
                                </td>
                                <td className="truncate px-2 py-2 font-medium">
                                  {t.title}
                                </td>
                                <td className={cn("py-2", LG_CELL)}>
                                  <span className="inline-flex items-center gap-1">
                                    <PriorityIcon
                                      priority={priority}
                                      className={cn(
                                        "h-4 w-4",
                                        PRIORITY_COLORS[priority]
                                      )}
                                    />
                                    <span className="text-xs">
                                      {PRIORITY_LABELS[priority]}
                                    </span>
                                  </span>
                                </td>
                                <td className={cn("py-2", LG_CELL)}>
                                  {category ? (
                                    (() => {
                                      const colors = categoryColors(
                                        category.preset,
                                        mode
                                      );
                                      return (
                                        <span
                                          className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-xs font-medium"
                                          style={{
                                            backgroundColor: colors.bg,
                                            color: colors.fg,
                                          }}
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
                                  {t.due_date ? (
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      <Clock className="size-3" />
                                      {dueRelative(t.due_date)}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="truncate px-2 py-2 text-xs text-muted-foreground">
                                  {channelName ? `#${channelName}` : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      <TicketModal
        open={!!openTicket}
        onOpenChange={(o) => {
          if (!o) setOpenTicket(null);
        }}
        channelId={openTicket?.channel_id ?? ""}
        channelMembers={assignablePool}
        profilesMap={profilesQ.map}
        initial={openTicket}
        initialAssigneeIds={openInitialAssigneeIds}
        canEdit={true}
        canDelete={isAdmin(profile)}
      />
    </div>
  );
}
