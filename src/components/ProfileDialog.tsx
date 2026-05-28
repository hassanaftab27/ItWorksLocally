import { useEffect, useState } from "react";
import { Save } from "lucide-react";
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
import { SplitBadge } from "@/components/ui/split-badge";
import { PresetPicker } from "@/components/ui/preset-picker";
import { ASSIGNEE_PRESETS, DEFAULT_ASSIGNEE_PRESET } from "@/lib/presets";
import { initials } from "@/lib/format";
import { useSession } from "@/features/auth/SessionProvider";
import { supabase } from "@/lib/supabase";

export function ProfileDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { profile, refreshProfile } = useSession();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState<string>(DEFAULT_ASSIGNEE_PRESET);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFullName(profile?.full_name ?? "");
      setEmail(profile?.email ?? "");
      setPreset(profile?.badge_preset ?? DEFAULT_ASSIGNEE_PRESET);
      setError(null);
      setInfo(null);
    }
  }, [open, profile]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setInfo(null);

    const trimmedName = fullName.trim() || null;
    const trimmedEmail = email.trim().toLowerCase();

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName, badge_preset: preset })
      .eq("id", profile.id);

    if (profileErr) {
      setSaving(false);
      setError(profileErr.message);
      return;
    }

    if (trimmedEmail && trimmedEmail !== profile.email) {
      const { error: authErr } = await supabase.auth.updateUser({ email: trimmedEmail });
      if (authErr) {
        setSaving(false);
        setError(`Saved name/badge. Email change failed: ${authErr.message}`);
        await refreshProfile();
        return;
      }
      setInfo(
        `A confirmation link was sent to ${trimmedEmail}. The email won't change until you click it.`
      );
    }

    await refreshProfile();
    setSaving(false);
    if (trimmedEmail === profile.email) onOpenChange(false);
  }

  const previewInitials = initials({
    full_name: fullName,
    email: profile?.email ?? "",
  });
  const previewPair = ASSIGNEE_PRESETS[preset] ?? ASSIGNEE_PRESETS[DEFAULT_ASSIGNEE_PRESET];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
        </DialogHeader>
        <form id="profile-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pf-name">Full name</Label>
            <Input
              id="pf-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pf-email">Email</Label>
            <Input
              id="pf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Changing email sends a confirmation link. Login email only updates after you
              click it.
            </p>
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Label>Badge color</Label>
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <span>Light</span>
                <SplitBadge colors={previewPair} label={previewInitials} size="md" />
                <span>Dark</span>
              </div>
            </div>
            <PresetPicker
              presets={ASSIGNEE_PRESETS}
              value={preset}
              onChange={setPreset}
            />
          </div>
          {info && <p className="text-sm text-primary">{info}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <span />
          <Button type="submit" form="profile-form" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
