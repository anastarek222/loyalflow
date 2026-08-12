"use client";

import { useState } from "react";
import { CreditCard } from "lucide-react";
import { LoyaltyCard, type LoyaltyCardProps } from "@/components/loyalty-card";

export function LoyaltyCardPreview({
  className = "",
  ...props
}: LoyaltyCardProps & { className?: string }) {
  const [side, setSide] = useState<"front" | "back">("front");
  const language = props.language ?? "EN";
  const copy =
    language === "AR"
      ? {
          title: "معاينة مباشرة",
          description: "هذا هو الكارت الذي سيظهر للعميل.",
          front: "الأمام",
          back: "الخلف",
        }
      : {
          title: "Live preview",
          description: "This is the card your customer will see.",
          front: "Front",
          back: "Back",
        };

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CreditCard
              className="size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <h3 className="font-black text-foreground">{copy.title}</h3>
          </div>
          <p className="mt-1 hidden text-xs text-foreground-muted sm:block">
            {copy.description}
          </p>
        </div>
        <div
          className="flex shrink-0 rounded-xl border border-border bg-surface-subtle p-1"
          role="group"
          aria-label="Card side"
        >
          {(["front", "back"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSide(item)}
              aria-pressed={side === item}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold transition sm:px-4 ${side === item ? "bg-primary text-[var(--lf-primary-foreground)] shadow-sm" : "text-foreground-muted hover:text-foreground"}`}
            >
              {item === "front" ? copy.front : copy.back}
            </button>
          ))}
        </div>
      </div>
      <div key={side} className="lf-card-reveal mx-auto w-full max-w-[680px]">
        <LoyaltyCard {...props} side={side} />
      </div>
    </section>
  );
}
