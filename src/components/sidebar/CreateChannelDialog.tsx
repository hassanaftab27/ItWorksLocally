import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateChannel } from "@/features/channels/queries";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

const NAME_RE = /^[a-z0-9][a-z0-9_-]{0,49}$/;

export function CreateChannelDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();
  const createMut = useCreateChannel();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setDescription("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const normalized = name.toLowerCase().trim();
    if (!NAME_RE.test(normalized)) {
      setError("Channel name must be lowercase letters, numbers, _ or - (max 50 chars).");
      return;
    }
    try {
      const created = await createMut.mutateAsync({
        name: normalized,
        description: description.trim() || null,
      });
      reset();
      onOpenChange(false);
      navigate(`/channels/${created.name}`);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            All channels are visible to everyone. You'll add members after creating.
          </DialogDescription>
        </DialogHeader>
        <form id="create-channel-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Name</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">#</span>
              <Input
                id="channel-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="design-reviews"
                autoFocus
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-desc">Description (optional)</Label>
            <Textarea
              id="channel-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this channel for?"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <span />
          <Button type="submit" form="create-channel-form" disabled={createMut.isPending || !name}>
            <Plus className="size-4" />
            {createMut.isPending ? "Creating..." : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
