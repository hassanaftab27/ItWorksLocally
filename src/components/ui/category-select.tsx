import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import type { Category } from "@/types/app";
import { categoryColors } from "@/lib/presets";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  available: Category[];
  selectedId: string | null;
  onChange: (id: string | null) => void;
  disabled?: boolean;
};

const POPOVER_MAX_PX = 200;

export function CategorySelect({ available, selectedId, onChange, disabled }: Props) {
  const { mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => available.find((c) => c.id === selectedId) ?? null,
    [available, selectedId]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [available, search]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    setOpenUp(spaceBelow < POPOVER_MAX_PX && rect.top > POPOVER_MAX_PX);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setSearch("");
  }, [open]);

  function pick(id: string | null) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm disabled:opacity-50"
        )}
      >
        {selected ? (
          <span className="inline-flex min-w-0 items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full"
              style={{ backgroundColor: categoryColors(selected.preset, mode).bg }}
            />
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">No category</span>
        )}
        <span className="ml-2 flex shrink-0 items-center gap-1">
          {selected && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                pick(null);
              }}
              className="rounded p-0.5 hover:bg-accent"
              aria-label="Clear category"
            >
              <X className="size-3" />
            </span>
          )}
          <ChevronDown className="size-4 text-muted-foreground" />
        </span>
      </button>

      {open && !disabled && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 overflow-hidden rounded-md border border-input bg-card text-card-foreground shadow-lg",
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          <div className="border-b p-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="w-full rounded border-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul className="max-h-40 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-1.5 text-xs text-muted-foreground">No matches</li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => pick(c.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColors(c.preset, mode).bg }}
                    />
                    <span className="truncate">{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
