"use client";

import { useState } from "react";
import type { ReactNode } from "react";

type RedeemRewardDialogProps = {
  action: () => void | Promise<void>;
  disabled: boolean;
  rewardName: string;
  cost: number;
  unitName: string;
  operationId: string;
  operationContextFields: ReactNode;
};

export default function RedeemRewardDialog({
  action,
  disabled,
  rewardName,
  cost,
  unitName,
  operationId,
  operationContextFields,
}: RedeemRewardDialogProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        استبدال المكافأة
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="redeem-reward-title"
          className="fixed inset-0 z-50 flex items-end bg-slate-950/60 p-4 sm:items-center sm:justify-center"
        >
          <section className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-sm font-bold text-emerald-700">
              تأكيد استبدال المكافأة
            </p>

            <h2
              id="redeem-reward-title"
              className="mt-2 text-xl font-black text-slate-950"
            >
              {rewardName}
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              سيتم خصم {cost} {unitName} من رصيد العميل وتسجيل عملية
              الاستبدال في السجل.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700"
              >
                إلغاء
              </button>

              <form action={action}>
                <input type="hidden" name="operationId" value={operationId} />
                {operationContextFields}
                <button
                  type="submit"
                  className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 sm:w-auto"
                >
                  تأكيد الاستبدال
                </button>
              </form>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
