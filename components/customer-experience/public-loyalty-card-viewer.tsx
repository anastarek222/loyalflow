"use client";

import { useState } from "react";
import { CreditCard, Gift, RotateCcw } from "lucide-react";

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
          rewardReadyTitle: "مكافأتك جاهزة للاستلام",
          rewardReadyBody: "وصلت للهدف. اعرض هذا الكارت للموظف لاستلام مكافأتك.",
        }
      : {
          title: "Digital loyalty card",
          hint: "View the other side for reward and contact details.",
          front: "Front",
          back: "Back",
          flip: "Flip card",
          rewardReadyTitle: "Your reward is ready",
          rewardReadyBody: "You reached the target. Show this card to staff to redeem your reward.",
        };

  const nextSide = side === "front" ? "back" : "front";
  const rewardReady =
    Math.max(0, Math.trunc(cardProps.balance)) >=
    Math.max(1, Math.trunc(cardProps.rewardThreshold));

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

      {rewardReady ? (
        <div
          role="status"
          data-testid="customer-reward-ready-notice"
          className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-4 shadow-sm"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Gift className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="font-black text-emerald-900">{copy.rewardReadyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">
              {copy.rewardReadyBody}
            </p>
            <p dir="auto" className="mt-2 text-sm font-black text-slate-950">
              {cardProps.rewardName}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-[680px]">
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
