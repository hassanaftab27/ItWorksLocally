import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Profile } from "@/types/app";
import { userName } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  available: Profile[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyAvailableText?: string;
  emptySearchText?: string;
  disabled?: boolean;
};

// Popover sizing: each row is ~32px, padding ~8px -> 3 rows ~ 104px.
const POPOVER_MAX_PX = 112;

export function UserMultiSelect({
  available,
  selectedIds,
  onChange,
  placeholder = "Search users...",
  emptyAvailableText = "Nothing to add",
  emptySearchText = "No matches",
  disabled,
}: Props) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const byId = useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of available) m.set(p.id, p);
    return m;
  }, [available]);

  const selectedProfiles = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter(Boolean) as Profile[],
    [selectedIds, byId]
  );

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const unselected = useMemo(() => {
    const q = search.trim().toLowerCase();
    return available
      .filter((p) => !selectedSet.has(p.id))
      .filter((p) => {
        if (!q) return true;
        return (
          userName(p).toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => userName(a).localeCompare(userName(b)));
  }, [available, selectedSet, search]);

  function add(id: string) {
    if (selectedSet.has(id)) return;
    onChange([...selectedIds, id]);
    setSearch("");
    inputRef.current?.focus();
  }

  function remove(id: string) {
    onChange(selectedIds.filter((x) => x !== id));
  }

  // Flip up if not enough room below
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

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && unselected.length > 0) {
      e.preventDefault();
      add(unselected[0].id);
    } else if (e.key === "Backspace" && search === "" && selectedIds.length > 0) {
      remove(selectedIds[selectedIds.length - 1]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center gap-1 rounded-md border border-input bg-background p-1.5 text-sm focus-within:ring-1 focus-within:ring-ring",
          disabled && "opacity-50"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedProfiles.map((p) => (
          <span
            key={p.id}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground"
          >
            <span className="truncate">{userName(p)}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                remove(p.id);
              }}
              className="-mr-0.5 shrink-0 rounded-full p-0.5 hover:bg-primary-foreground/20 disabled:opacity-50"
              aria-label={`Remove ${userName(p)}`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          placeholder={selectedProfiles.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="min-w-[6rem] flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground"
        />
      </div>

      {open && !disabled && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 overflow-auto rounded-md border border-input bg-card text-card-foreground shadow-lg",
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
          style={{ maxHeight: POPOVER_MAX_PX }}
        >
          {unselected.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              {available.length === selectedIds.length ? emptyAvailableText : emptySearchText}
            </div>
          ) : (
            <ul className="py-1">
              {unselected.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => add(p.id)}
                    className="flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  >
                    <span className="min-w-0 truncate">{userName(p)}</span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {p.email}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
