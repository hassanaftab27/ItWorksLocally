import { useEffect, useState } from "react";
import { Save, Send, Trash2, UserPlus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { profilesKeys, useProfiles } from "@/features/profiles/queries";
import { useCreateUser, useDeleteUser } from "@/features/admin/adminOps";
import { useSession } from "@/features/auth/SessionProvider";
import { supabase } from "@/lib/supabase";
import { userName } from "@/lib/format";
import type { Profile, Role } from "@/types/app";

export function AdminUsersPage() {
  const { data: profiles = [], isLoading } = useProfiles();
  const { profile: me } = useSession();
  const deleteMut = useDeleteUser();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);

  async function onDelete(userId: string, label: string) {
    if (!confirm(`Delete ${label}? Their tickets stay, but show as "Deleted User".`)) return;
    try {
      await deleteMut.mutateAsync(userId);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="truncate text-lg font-semibold">Users</h2>
        <Button onClick={() => setInviteOpen(true)} size="sm">
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Invite User</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-md border">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading...</div>
          ) : profiles.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">No users yet.</div>
          ) : (
            <ul className="divide-y">
              {profiles.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <button
                    type="button"
                    onClick={() => setEditUser(p)}
                    className="min-w-0 flex-1 rounded text-left"
                    aria-label={`Edit ${userName(p)}`}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="truncate font-medium">{userName(p)}</span>
                      <Badge
                        className={
                          p.role === "admin"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {p.role}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{p.email}</div>
                  </button>
                  {me?.id !== p.id && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onDelete(p.id, userName(p))}
                      disabled={deleteMut.isPending}
                      aria-label={`Delete ${userName(p)}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <EditUserDialog
        user={editUser}
        open={editUser !== null}
        onOpenChange={(o) => {
          if (!o) setEditUser(null);
        }}
      />
    </div>
  );
}

function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      setFullName(user.full_name ?? "");
      setRole(user.role as Role);
      setError(null);
    }
  }, [open, user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() || null, role })
      .eq("id", user.id);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    qc.invalidateQueries({ queryKey: profilesKeys.all });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form id="edit-user-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eu-email">Email</Label>
            <Input id="eu-email" value={user?.email ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eu-name">Full name</Label>
            <Input
              id="eu-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eu-role">Role</Label>
            <select
              id="eu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <span />
          <Button type="submit" form="edit-user-form" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMut = useCreateUser();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setEmail("");
    setFullName("");
    setRole("member");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createMut.mutateAsync({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || undefined,
        role,
      });
      reset();
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite User</DialogTitle>
        </DialogHeader>
        <form id="invite-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="iu-email">Email</Label>
            <Input
              id="iu-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iu-name">Full name (optional)</Label>
            <Input
              id="iu-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="iu-role">Role</Label>
            <select
              id="iu-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <span />
          <Button
            type="submit"
            form="invite-form"
            disabled={createMut.isPending || !email}
          >
            <Send className="size-4" />
            {createMut.isPending ? "Sending..." : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
