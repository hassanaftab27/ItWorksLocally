import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

// Every 30 minutes across the day, as { value: "HH:mm", label: "h:mm AM/PM" }.
const TIME_OPTIONS = (() => {
  const opts: { value: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const ampm = h < 12 ? "AM" : "PM";
    opts.push({ value: `${pad(h)}:${pad(mm)}`, label: `${h12}:${pad(mm)} ${ampm}` });
  }
  return opts;
})();

const POPOVER_MAX_PX = 240;

function TimeSelect({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (t: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);

  const selectedLabel = useMemo(
    () => TIME_OPTIONS.find((o) => o.value === value)?.label ?? null,
    [value]
  );

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

  // Center the current selection when the popover opens.
  useEffect(() => {
    if (open) selectedRef.current?.scrollIntoView({ block: "center" });
  }, [open]);

  function scroll(dir: 1 | -1) {
    listRef.current?.scrollBy({ top: dir * 96, behavior: "smooth" });
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-2 text-sm shadow-sm disabled:opacity-50"
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel ?? "Time"}
        </span>
        <Clock className="ml-2 size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && !disabled && (
        <div
          className={cn(
            "absolute left-0 right-0 z-50 overflow-hidden rounded-md border border-input bg-card text-card-foreground shadow-lg",
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          )}
        >
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll up"
            className="flex w-full items-center justify-center border-b py-1 hover:bg-accent"
          >
            <ChevronUp className="size-4" />
          </button>
          <ul ref={listRef} className="max-h-40 overflow-auto py-1">
            {TIME_OPTIONS.map((o) => (
              <li key={o.value}>
                <button
                  ref={o.value === value ? selectedRef : undefined}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full px-3 py-1.5 text-center text-sm hover:bg-accent hover:text-accent-foreground",
                    o.value === value && "bg-accent font-medium"
                  )}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll down"
            className="flex w-full items-center justify-center border-t py-1 hover:bg-accent"
          >
            <ChevronDown className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

type Props = {
  id?: string;
  // "YYYY-MM-DDTHH:mm" or "" -- same shape a datetime-local input produces.
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function DateTimePicker({ id, value, onChange, disabled }: Props) {
  const datePart = value.slice(0, 10);
  const timePart = value.slice(11, 16);

  function setDate(d: string) {
    // Clearing the date clears the whole due date.
    if (!d) return onChange("");
    onChange(`${d}T${timePart || "09:00"}`);
  }
  function setTime(t: string) {
    const d = datePart || new Date().toISOString().slice(0, 10);
    onChange(`${d}T${t}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        id={id}
        type="date"
        value={datePart}
        onChange={(e) => setDate(e.target.value)}
        disabled={disabled}
        className="min-w-0 flex-1 lg:w-36 lg:flex-none"
      />
      <TimeSelect value={timePart} onChange={setTime} disabled={disabled || !datePart} />
    </div>
  );
}
