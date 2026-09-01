import {
  ArrowUpRight,
  Check,
  Coffee,
  QrCode,
  Stamp,
  Users,
} from "lucide-react";

import { translate } from "@/lib/i18n/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";

type ProductPreviewProps = {
  locale: SupportedLocale;
  labels: {
    preview: string;
    dashboard: string;
    activeCustomers: string;
    repeatRate: string;
    activity: string;
    customer: string;
    visits: string;
    reward: string;
    readySoon: string;
  };
};

export function ProductPreview({ locale, labels }: ProductPreviewProps) {
  const number = new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US");

  return (
    <div
      className="mx-auto w-full min-w-0 max-w-[42rem] lg:mx-0"
      aria-label={labels.preview}
    >
      <div className="rounded-[1.35rem] border border-border bg-white p-3 shadow-[var(--lf-shadow-raised)] sm:p-4">
        <div className="rounded-2xl border border-border/80 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">
                {labels.dashboard}
              </p>
              <h2 className="mt-1 text-lg font-black text-foreground">
                Nile Brew Café
              </h2>
            </div>
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[var(--lf-primary-soft)] text-primary">
              <Coffee size={20} aria-hidden="true" />
            </span>
          </div>

          <div className="mt-5 grid gap-3 min-[390px]:grid-cols-2">
            <div className="rounded-xl bg-surface-subtle p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground-subtle">
                <Users size={15} aria-hidden="true" />
                {labels.activeCustomers}
              </div>
              <p dir="ltr" className="mt-2 text-2xl font-black text-foreground">
                {number.format(248)}
              </p>
            </div>
            <div className="rounded-xl bg-[var(--lf-primary-soft)] p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                <ArrowUpRight size={15} aria-hidden="true" />
                {labels.repeatRate}
              </div>
              <p dir="ltr" className="mt-2 text-2xl font-black text-primary">
                68%
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-border p-3.5">
            <p className="text-xs font-bold text-foreground-subtle">
              {labels.activity}
            </p>
            <div className="mt-3 flex flex-col items-start gap-3 min-[390px]:flex-row min-[390px]:items-center min-[390px]:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                  <Check size={17} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">
                    Ahmed Mohamed
                  </p>
                  <p className="text-xs text-foreground-subtle">
                    +1 {labels.visits}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                {labels.customer}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative -mt-4 ms-auto w-[94%] max-w-[25rem] overflow-hidden rounded-[1.4rem] border border-primary/20 bg-primary p-5 text-white shadow-[var(--lf-shadow-overlay)] sm:-mt-8 sm:w-[88%] sm:p-6">
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-white/14">
              <Stamp size={18} aria-hidden="true" />
            </span>
            <span className="font-black">Nile Brew</span>
          </div>
          <span className="rounded-lg bg-white p-2 text-primary">
            <QrCode size={34} aria-hidden="true" />
          </span>
        </div>
        <div className="relative mt-8">
          <p className="text-xs font-semibold text-white/80">
            {labels.reward}
          </p>
          <p className="mt-1 text-lg font-black">
            {translate(locale, "marketing.previewRewardName")}
          </p>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-white/80">Ahmed Mohamed</p>
              <p dir="ltr" className="mt-1 text-sm font-bold tracking-wide">
                LF-001234
              </p>
            </div>
            <div className="text-end">
              <p dir="ltr" className="text-2xl font-black">
                4 / 5
              </p>
              <p className="text-xs text-white/80">{labels.readySoon}</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-4/5 rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
