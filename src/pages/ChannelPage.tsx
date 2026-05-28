import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { LayoutGrid, List, Plus, Settings } from "lucide-react";
import { useSession } from "@/features/auth/SessionProvider";
import { useChannelByName, useChannelMembers } from "@/features/channels/queries";
import { useChannelTickets } from "@/features/tickets/queries";
import { useProfilesMap } from "@/features/profiles/queries";
import { useCategories } from "@/features/categories/queries";
import { isAdmin, canCreateTicket, canEditTicket, canDeleteTicket } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { KanbanView } from "@/components/channel/KanbanView";
import { ListView } from "@/components/channel/ListView";
import { TicketModal } from "@/components/channel/TicketModal";
import { ChannelSettingsDialog } from "@/components/channel/ChannelSettingsDialog";
import type { Category, Profile, Ticket } from "@/types/app";

type ViewMode = "kanban" | "list";

export function ChannelPage() {
  const { channelName } = useParams();
  const { profile } = useSession();
  const channelQ = useChannelByName(channelName);
  const channel = channelQ.data;

  const membersQ = useChannelMembers(channel?.id);
  const ticketsQ = useChannelTickets(channel?.id);
  const profilesQ = useProfilesMap();
  const categoriesQ = useCategories();

  const [view, setView] = useState<ViewMode>("kanban");
  const [ticketModal, setTicketModal] = useState<{ open: boolean; ticket: Ticket | null }>({
    open: false,
    ticket: null,
  });
  const [settingsOpen, setSettingsOpen] = useState(false);

  const memberIds = useMemo(
    () => new Set((membersQ.data?.members ?? []).map((m) => m.user_id)),
    [membersQ.data]
  );

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
    for (const c of categoriesQ.data ?? []) m.set(c.id, c);
    return m;
  }, [categoriesQ.data]);

  if (channelQ.isLoading) {
    return <div className="p-6 text-muted-foreground">Loading...</div>;
  }
  if (!channel) {
    return <div className="p-6 text-muted-foreground">Channel not found.</div>;
  }

  const tickets = ticketsQ.data?.tickets ?? [];
  const assignees = ticketsQ.data?.assignees ?? [];
  const canCreate = canCreateTicket(profile, memberIds);
  const canEdit = canEditTicket(profile, memberIds);
  const canDelete = canDeleteTicket(profile);
  const initialAssigneeIds = ticketModal.ticket
    ? assignees.filter((a) => a.ticket_id === ticketModal.ticket!.id).map((a) => a.user_id)
    : [];

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">
            <span className="text-muted-foreground">#</span>
            {channel.name}
          </h2>
          {channel.description && (
            <p className="truncate text-xs text-muted-foreground">{channel.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button size="sm" onClick={() => setTicketModal({ open: true, ticket: null })}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">New Ticket</span>
            </Button>
          )}
          <div className="flex overflow-hidden rounded-md border">
            <button
              className={
                "inline-flex items-center gap-1.5 px-2 py-1 text-sm transition " +
                (view === "kanban" ? "bg-accent" : "hover:bg-accent/40")
              }
              onClick={() => setView("kanban")}
              title="Board"
              aria-label="Board view"
            >
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              className={
                "inline-flex items-center gap-1.5 border-l px-2 py-1 text-sm transition " +
                (view === "list" ? "bg-accent" : "hover:bg-accent/40")
              }
              onClick={() => setView("list")}
              title="List"
              aria-label="List view"
            >
              <List className="size-4" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
          {isAdmin(profile) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSettingsOpen(true)}
              aria-label="Channel settings"
            >
              <Settings className="size-4" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {view === "kanban" ? (
          <KanbanView
            channelId={channel.id}
            tickets={tickets}
            assignees={assignees}
            profilesMap={profilesQ.map}
            categoriesMap={categoriesMap}
            canEdit={canEdit}
            onTicketClick={(t) => setTicketModal({ open: true, ticket: t })}
          />
        ) : (
          <ListView
            channelId={channel.id}
            tickets={tickets}
            assignees={assignees}
            profilesMap={profilesQ.map}
            categoriesMap={categoriesMap}
            onTicketClick={(t) => setTicketModal({ open: true, ticket: t })}
          />
        )}
      </div>

      <TicketModal
        open={ticketModal.open}
        onOpenChange={(o) => setTicketModal({ open: o, ticket: o ? ticketModal.ticket : null })}
        channelId={channel.id}
        channelMembers={assignablePool}
        profilesMap={profilesQ.map}
        initial={ticketModal.ticket}
        initialAssigneeIds={initialAssigneeIds}
        canEdit={canEdit}
        canDelete={canDelete}
      />

      <ChannelSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        channel={channel}
      />
    </div>
  );
}
