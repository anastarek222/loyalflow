import type { ReactNode } from "react";

export function LegalSurface({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      {children}
    </div>
  );
}
