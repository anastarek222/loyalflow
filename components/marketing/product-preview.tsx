import type { SupportedLocale } from "@/lib/i18n/config";
import { BarChart3, Gift, QrCode, ScanLine, Users } from "lucide-react";

export function ProductPreview({ locale }: { locale: SupportedLocale }) {
  const ar = locale === "ar";

  return (
    <div className="relative mx-auto grid max-w-[40rem] gap-3 sm:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-[1.7rem] border border-white/80 bg-white/[0.94] p-4 shadow-[0_20px_48px_rgb(23_23_23/0.16)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF6652]">Tanee</p>
            <h2 className="mt-1 text-lg font-extrabold text-[#171717]">
              {ar ? "بطاقة الولاء" : "Loyalty card"}
            </h2>
          </div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#FFF0EC] text-[#A84724]">
            <QrCode size={22} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-[#FFF9F5] p-4">
          <p className="text-xs font-semibold text-[#6F6862]">
            {ar ? "تقدم العميل" : "Customer progress"}
          </p>
          <p className="mt-2 text-2xl font-extrabold text-[#171717]">4 / 5</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEE6DF]">
            <div className="h-full w-4/5 rounded-full bg-[#FF6652]" />
          </div>
          <p className="mt-3 text-xs font-semibold text-[#6F6862]">
            {ar ? "زيارة واحدة للمكافأة الجاية" : "One visit to the next reward"}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-[#E6DED6] p-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#E8FBF5] text-[#0E6B55]">
            <Gift size={17} aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs text-[#6F6862]">{ar ? "المكافأة" : "Reward"}</p>
            <p className="text-sm font-bold text-[#171717]">{ar ? "مشروب مجاني" : "Free signature drink"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[1.7rem] border border-white/80 bg-white/[0.94] p-4 shadow-[0_20px_48px_rgb(23_23_23/0.16)] backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-[#FF6652]">
              {ar ? "نظرة سريعة" : "Overview"}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-[#171717]">
              {ar ? "نشاط الولاء" : "Loyalty activity"}
            </h2>
          </div>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[#E8FBF5] text-[#0E6B55]">
            <BarChart3 size={22} aria-hidden="true" />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#FFF9F5] p-3.5">
            <Users size={17} className="text-[#A84724]" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold text-[#6F6862]">{ar ? "العملاء" : "Customers"}</p>
            <p className="mt-1 text-xl font-extrabold text-[#171717]">248</p>
          </div>
          <div className="rounded-2xl bg-[#FFF9F5] p-3.5">
            <ScanLine size={17} className="text-[#A84724]" aria-hidden="true" />
            <p className="mt-3 text-xs font-semibold text-[#6F6862]">{ar ? "زيارات مسجلة" : "Recorded visits"}</p>
            <p className="mt-1 text-xl font-extrabold text-[#171717]">612</p>
          </div>
        </div>

        <div className="mt-3 rounded-2xl border border-[#E6DED6] p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6F6862]">
            <span>{ar ? "آخر النشاط" : "Latest activity"}</span>
            <span className="text-[#0E6B55]">{ar ? "مسجل" : "Recorded"}</span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-full bg-[#FFF0EC] text-[#A84724]">
              <ScanLine size={16} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-[#171717]">{ar ? "زيارة عميل" : "Customer visit"}</p>
              <p className="text-xs text-[#6F6862]">{ar ? "تم تحديث التقدم" : "Progress updated"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
