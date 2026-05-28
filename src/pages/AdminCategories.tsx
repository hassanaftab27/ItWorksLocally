import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
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
import { PresetPicker } from "@/components/ui/preset-picker";
import { SplitBadge } from "@/components/ui/split-badge";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/features/categories/queries";
import {
  CATEGORY_PRESETS,
  DEFAULT_CATEGORY_PRESET,
  categoryColors,
} from "@/lib/presets";
import { useTheme } from "@/lib/theme";
import type { Category } from "@/types/app";

export function AdminCategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();
  const deleteMut = useDeleteCategory();
  const { mode } = useTheme();
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  async function onDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"? Tickets currently using it become uncategorized.`))
      return;
    try {
      await deleteMut.mutateAsync(c.id);
    } catch (err) {
      alert((err as Error).message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="truncate text-lg font-semibold">Categories</h2>
        <Button onClick={() => setEditing("new")} size="sm">
          <Plus className="size-4" />
          <span className="hidden sm:inline">New Category</span>
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            No categories yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((c) => {
              const colors = categoryColors(c.preset, mode);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-2 rounded-md border p-3"
                >
                  <button
                    onClick={() => setEditing(c)}
                    className="flex min-w-0 flex-1 text-left"
                    aria-label={`Edit ${c.name}`}
                  >
                    <span
                      className="inline-flex h-7 max-w-full items-center truncate rounded-full px-3 text-xs font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.fg }}
                    >
                      {c.name}
                    </span>
                  </button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDelete(c)}
                    disabled={deleteMut.isPending}
                    aria-label={`Delete ${c.name}`}
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CategoryDialog
        open={editing !== null}
        category={editing === "new" ? null : editing}
        onOpenChange={(o) => {
          if (!o) setEditing(null);
        }}
      />
    </div>
  );
}

function CategoryDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean;
  category: Category | null;
  onOpenChange: (open: boolean) => void;
}) {
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const [name, setName] = useState("");
  const [preset, setPreset] = useState<string>(DEFAULT_CATEGORY_PRESET);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(category?.name ?? "");
      setPreset(category?.preset ?? DEFAULT_CATEGORY_PRESET);
      setError(null);
    }
  }, [open, category]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name required");
      return;
    }
    try {
      if (category) {
        await updateMut.mutateAsync({ id: category.id, name: trimmed, preset });
      } else {
        await createMut.mutateAsync({ name: trimmed, preset });
      }
      onOpenChange(false);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const saving = createMut.isPending || updateMut.isPending;
  const previewPair = CATEGORY_PRESETS[preset] ?? CATEGORY_PRESETS[DEFAULT_CATEGORY_PRESET];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <form id="cat-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Color preset</Label>
              <div className="flex flex-col items-end gap-1 text-[10px] text-muted-foreground">
                <SplitBadge colors={previewPair} label={name.slice(0, 1).toUpperCase() || "?"} size="md" />
                <span>light / dark</span>
              </div>
            </div>
            <PresetPicker
              presets={CATEGORY_PRESETS}
              value={preset}
              onChange={setPreset}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </form>
        <DialogFooter>
          <span />
          <Button type="submit" form="cat-form" disabled={saving}>
            <Save className="size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
