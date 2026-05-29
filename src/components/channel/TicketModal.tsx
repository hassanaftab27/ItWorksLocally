import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { UserMultiSelect } from "@/components/ui/user-multi-select";
import { CategorySelect } from "@/components/ui/category-select";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { STATUSES, STATUS_LABELS } from "@/lib/statuses";
import { PRIORITIES, PRIORITY_LABELS } from "@/lib/priorities";
import { relativeTime, toDatetimeLocal, userName } from "@/lib/format";
import { useCategories } from "@/features/categories/queries";
import {
  useCreateTicket,
  useDeleteTicket,
  useUpdateTicket,
} from "@/features/tickets/queries";
import type {
  Priority,
  Profile,
  Ticket,
  TicketStatus,
  TicketType,
} from "@/types/app";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  channelMembers: Profile[];
  profilesMap: Map<string, Profile>;
  initial?: Ticket | null;
  initialAssigneeIds?: string[];
  canEdit: boolean;
  canDelete: boolean;
};

export function TicketModal({
  open,
  onOpenChange,
  channelId,
  channelMembers,
  profilesMap,
  initial,
  initialAssigneeIds = [],
  canEdit,
  canDelete,
}: Props) {
  const isEdit = !!initial;
  const createMut = useCreateTicket(channelId);
  const updateMut = useUpdateTicket(channelId);
  const deleteMut = useDeleteTicket(channelId);
  const { data: categories = [] } = useCategories();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("task");
  const [status, setStatus] = useState<TicketStatus>("work");
  const [priority, setPriority] = useState<Priority>("medium");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [dueDate, setDueDate] = useState("");
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Populate the form only when the modal opens or the ticket being edited
  // changes -- NOT on every parent re-render. `initialAssigneeIds` is a fresh
  // array each render, so depending on it here would reset the form (wiping
  // what you're typing) whenever a background query refetch re-renders the
  // parent. We read it at run time instead.
  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setDescription(initial?.description ?? "");
      setType((initial?.type as TicketType) ?? "task");
      setStatus((initial?.status as TicketStatus) ?? "work");
      setPriority((initial?.priority as Priority) ?? "medium");
      setCategoryId(initial?.category_id ?? null);
      setProgress(initial?.progress ?? 0);
      setDueDate(toDatetimeLocal(initial?.due_date));
      setAssigneeIds(initialAssigneeIds);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        title,
        description: description || null,
        type,
        status,
        priority,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        category_id: categoryId,
        progress,
        assigneeIds,
      };
      if (isEdit) {
        await updateMut.mutateAsync({ id: initial!.id, ...payload });
      } else {
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onDelete() {
    if (!initial) return;
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    try {
      await deleteMut.mutateAsync(initial.id);
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;
  const readOnly = !canEdit;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? "Edit Ticket" : "New Ticket"}
            {readOnly && (
              <Badge className="bg-muted text-muted-foreground">view only</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form id="ticket-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              autoFocus
              disabled={readOnly}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              disabled={readOnly}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr_0.7fr]">
            <div className="space-y-2">
              <Label htmlFor="t-type">Type</Label>
              <select
                id="t-type"
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                disabled={readOnly}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
              >
                <option value="task">Task</option>
                <option value="bug">Bug</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <CategorySelect
                available={categories}
                selectedId={categoryId}
                onChange={setCategoryId}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-priority">Priority</Label>
              <select
                id="t-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                disabled={readOnly}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr_0.7fr]">
            <div className="space-y-2">
              <Label htmlFor="t-status">Column</Label>
              <select
                id="t-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
                disabled={readOnly}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-due">Due date and time</Label>
              <DateTimePicker
                id="t-due"
                value={dueDate}
                onChange={setDueDate}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="t-progress">Progress: {progress}%</Label>
              <input
                id="t-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progress}
                onChange={(e) => setProgress(Number(e.target.value))}
                disabled={readOnly}
                className="h-9 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            {channelMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No channel members yet.</p>
            ) : (
              <UserMultiSelect
                available={channelMembers}
                selectedIds={assigneeIds}
                onChange={setAssigneeIds}
                disabled={readOnly}
                placeholder="Search to assign..."
              />
            )}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>

        {initial && (
          <div className="space-y-1 border-t pt-3 text-xs text-muted-foreground">
            <div>
              Created by{" "}
              <span className="font-medium text-foreground">
                {userName(profilesMap.get(initial.created_by ?? "") ?? null)}
              </span>{" - "}
              {relativeTime(initial.created_at)}
            </div>
            {initial.last_edited_at && (
              <div>
                Last edited by{" "}
                <span className="font-medium text-foreground">
                  {userName(profilesMap.get(initial.last_edited_by ?? "") ?? null)}
                </span>{" - "}
                {relativeTime(initial.last_edited_at)}
              </div>
            )}
            {initial.last_moved_at && (
              <div>
                Last moved by{" "}
                <span className="font-medium text-foreground">
                  {userName(profilesMap.get(initial.last_moved_by ?? "") ?? null)}
                </span>{" - "}
                {relativeTime(initial.last_moved_at)}
              </div>
            )}
          </div>
        )}

        {((isEdit && canDelete) || !readOnly) && (
          <DialogFooter>
            {isEdit && canDelete ? (
              <Button
                type="button"
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
            ) : (
              <span />
            )}
            {!readOnly ? (
              <Button type="submit" form="ticket-form" disabled={submitting || !title}>
                <Save className="size-4" />
                {submitting ? "Saving..." : isEdit ? "Save" : "Create"}
              </Button>
            ) : (
              <span />
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
