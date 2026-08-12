"use client";

import { useState } from "react";
import { CreditCard, RotateCcw } from "lucide-react";

import { LoyaltyCard, type LoyaltyCardProps } from "@/components/loyalty-card";

type PublicLoyaltyCardViewerProps = LoyaltyCardProps & {
  language: "AR" | "EN";
};

export function PublicLoyaltyCardViewer({
  language,
  ...cardProps
}: PublicLoyaltyCardViewerProps) {
  const [side, setSide] = useState<"front" | "back">("front");
  const copy =
    language === "AR"
      ? {
          title: "كارت الولاء الرقمي",
          hint: "اعرض الوجه الآخر لمعرفة تفاصيل المكافأة والتواصل.",
          front: "الوجه الأمامي",
          back: "الوجه الخلفي",
          flip: "اقلب الكارت",
        }
      : {
          title: "Digital loyalty card",
          hint: "View the other side for reward and contact details.",
          front: "Front",
          back: "Back",
          flip: "Flip card",
        };

  const nextSide = side === "front" ? "back" : "front";

  return (
    <section
      className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 p-3 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.55)] backdrop-blur sm:p-5"
      aria-label={copy.title}
    >
      <div className="mb-4 flex items-center justify-between gap-4 px-1 sm:px-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-slate-950">
            <CreditCard className="size-4 shrink-0" aria-hidden="true" />
            <h2 className="truncate text-sm font-black sm:text-base">
              {copy.title}
            </h2>
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">
            {copy.hint}
          </p>
        </div>

        <div
          className="flex shrink-0 rounded-xl border border-slate-200 bg-slate-100 p-1"
          role="group"
          aria-label={copy.title}
        >
          {(["front", "back"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setSide(item)}
              aria-pressed={side === item}
              className={`min-h-9 rounded-lg px-3 py-1.5 text-xs font-black transition sm:px-4 ${
                side === item
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item === "front" ? copy.front : copy.back}
            </button>
          ))}
        </div>
      </div>

      <div key={side} className="lf-card-reveal mx-auto w-full max-w-[680px]">
        <LoyaltyCard {...cardProps} language={language} side={side} />
      </div>

      <button
        type="button"
        onClick={() => setSide(nextSide)}
        className="mx-auto mt-4 flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
      >
        <RotateCcw className="size-4" aria-hidden="true" />
        {copy.flip}
      </button>
    </section>
  );
}
