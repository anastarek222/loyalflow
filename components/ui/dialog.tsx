"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, title, description, children, className }: { open: boolean; onClose: () => void; title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const focusable = panelRef.current?.querySelector<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
    (focusable ?? panelRef.current)?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab" || !panelRef.current) return;
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); previousFocus?.focus(); };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/50 p-4 sm:items-center" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn("max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[var(--lf-radius-input)] bg-surface p-6 shadow-[var(--lf-shadow-overlay)] outline-none sm:p-6", className)}><h2 id={titleId} className="lf-type-section text-foreground">{title}</h2>{description && <p id={descriptionId} className="mt-1 text-sm leading-6 text-foreground-muted">{description}</p>}<div className="mt-6">{children}</div></div></div>;
}

export function ConfirmationDialog({ open, onClose, title, description, confirmLabel, cancelLabel = "Cancel", pendingLabel = "Working…", onConfirm, destructive = false, isPending = false }: { open: boolean; onClose: () => void; title: ReactNode; description: ReactNode; confirmLabel: string; cancelLabel?: string; pendingLabel?: string; onConfirm: () => void; destructive?: boolean; isPending?: boolean }) {
  return (
    <Dialog open={open} onClose={onClose} title={title} description={description}>
      <div className="flex flex-wrap justify-end gap-4">
        <Button type="button" variant="outline" onClick={onClose}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={destructive ? "destructive" : "default"}
          loading={isPending}
          onClick={onConfirm}
        >
          {isPending ? pendingLabel : confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
