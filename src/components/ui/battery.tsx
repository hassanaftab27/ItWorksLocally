import { cn } from "@/lib/utils";

// Thick-but-short progress bar with the % embedded inside. The label sticks
// to whichever side has more room (left when filled past 50%, right when
// below) so it always sits on a single color background.
export function Battery({ value }: { value: number }) {
  const onLeft = value >= 50;
  return (
    <div
      className="relative h-4 w-14 shrink-0 overflow-hidden rounded border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-800"
      aria-label={`${value}% complete`}
    >
      <div
        className="absolute inset-y-0 left-0 bg-blue-500 dark:bg-blue-400"
        style={{ width: `${value}%` }}
      />
      <span
        className={cn(
          "absolute inset-y-0 flex items-center text-[10px] font-bold leading-none tabular-nums",
          onLeft ? "left-1 text-white" : "right-1 text-blue-800 dark:text-blue-100"
        )}
      >
        {value}%
      </span>
    </div>
  );
}
