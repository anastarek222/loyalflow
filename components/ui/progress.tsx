import { cn } from "@/lib/utils";

export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className={cn("grid gap-1", className)}>
      <div className="flex justify-between gap-4 text-xs text-foreground-muted">
        <span>{label}</span>
        <span className="lf-type-numeric">{safeValue}%</span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-surface-subtle"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safeValue}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}