"use client";

import { useState } from "react";
import { LoyaltyCard, type LoyaltyCardProps } from "@/components/loyalty-card";

export function LoyaltyCardPreview({ className = "", ...props }: LoyaltyCardProps & { className?: string }) {
  const [side, setSide] = useState<"front" | "back">("front");
  return (
    <section className={className}>
      <div className="mb-3 flex justify-end gap-2" role="group" aria-label="Card side">
        {(["front", "back"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setSide(item)}
            aria-pressed={side === item}
            className={`rounded-lg border px-4 py-2 text-sm font-bold ${side === item ? "border-primary bg-primary text-[var(--lf-primary-foreground)]" : "border-border bg-white text-foreground-muted"}`}
          >
            {item === "front" ? "Front" : "Back"}
          </button>
        ))}
      </div>
      <LoyaltyCard {...props} side={side} />
    </section>
  );
}
