import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import {
  useAddChannelMember,
  useChannelMembers,
  useDeleteChannel,
  useRemoveChannelMember,
  useUpdateChannel,
} from "@/features/channels/queries";
import { useProfiles } from "@/features/profiles/queries";
import type { Channel } from "@/types/app";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,49}$/;

export function ChannelSettingsDialog({
  open,
  onOpenChange,
  channel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}) {
  const navigate = useNavigate();
  const updateMut = useUpdateChannel();
  const deleteMut = useDeleteChannel();
  const { data: allProfiles = [] } = useProfiles();
  const { data: memberData } = useChannelMembers(channel.id);
  const addMut = useAddChannelMember(channel.id);
  const removeMut = useRemoveChannelMember(channel.id);

  const [name, setName] = useState(channel.name);
  const [description, setDescription] = useState(channel.description ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(channel.name);
      setDescription(channel.description ?? "");
      setError(null);
    }
  }, [open, channel]);

  const memberIds = useMemo(
    () => (memberData?.members ?? []).map((m) => m.user_id),
    [memberData]
  );
  const selectableProfiles = useMemo(
    () => allProfiles.filter((p) => p.role !== "admin"),
    [allProfiles]
  );

  function onMembersChange(next: string[]) {
    const before = new Set(memberIds);
    const after = new Set(next);
    for (const id of next) if (!before.has(id)) addMut.mutate(id);
    for (const id of memberIds) if (!after.has(id)) removeMut.mutate(id);
  }

  async function onSaveDetails() {
    setError(null);
    const normalized = name.toLowerCase().trim();
    if (!NAME_RE.test(normalized)) {
      setError("Channel name must be lowercase letters, numbers, _ or - (max 50 chars).");
      return;
    }
    try {
      const wasRename = normalized !== channel.name;
      await updateMut.mutateAsync({
        id: channel.id,
        name: normalized,
        description: description.trim() || null,
      });
      if (wasRename) navigate(`/channels/${normalized}`, { replace: true });
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete() {
    if (!confirm(`Delete #${channel.name}? Tickets and memberships will be removed.`)) return;
    try {
      await deleteMut.mutateAsync(channel.id);
      onOpenChange(false);
      navigate("/", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>#{channel.name} settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="cs-name">Name</Label>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">#</span>
                <Input id="cs-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cs-desc">Description</Label>
              <Textarea
                id="cs-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Members</h3>
            <p className="text-xs text-muted-foreground">
              Search to add a member. Click the remove icon on a chip to take them off. Admins belong to every channel automatically and don't appear here.
            </p>
            <UserMultiSelect
              available={selectableProfiles}
              selectedIds={memberIds}
              onChange={onMembersChange}
              disabled={addMut.isPending || removeMut.isPending}
              placeholder="Search users to add..."
              emptyAvailableText="Everyone is already in this channel"
            />
          </section>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={deleteMut.isPending}
            aria-label="Delete"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </span>
          </Button>
          <Button onClick={onSaveDetails} disabled={updateMut.isPending}>
            <Save className="size-4" />
            {updateMut.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
