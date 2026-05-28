import { useState } from "react";
import { Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  organizationLogoUrl,
  useOrganization,
  useRemoveOrgLogo,
  useUploadOrgLogo,
} from "@/features/organization/queries";

export function OrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: org } = useOrganization();
  const uploadMut = useUploadOrgLogo();
  const removeMut = useRemoveOrgLogo();
  const [error, setError] = useState<string | null>(null);

  const logoUrl = organizationLogoUrl(org);
  const busy = uploadMut.isPending || removeMut.isPending;

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > 1_000_000) {
      setError("Logo must be under 1 MB.");
      return;
    }
    try {
      await uploadMut.mutateAsync(file);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onRemove() {
    setError(null);
    try {
      await removeMut.mutateAsync();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Organization</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Company logo</Label>
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="size-14 rounded border object-contain"
                />
              ) : (
                <div className="flex size-14 items-center justify-center rounded border bg-muted text-xs text-muted-foreground">
                  none
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm" disabled={busy}>
                  <label className="cursor-pointer">
                    <Upload className="size-4" />
                    {uploadMut.isPending ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/png,image/svg+xml,image/jpeg,image/webp"
                      className="hidden"
                      onChange={onFileChange}
                      disabled={busy}
                    />
                  </label>
                </Button>
                {org?.logo_path && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRemove}
                    disabled={busy}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Shown in the sidebar, left of the app logo. PNG or SVG, square works best.
              Max 1 MB.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
