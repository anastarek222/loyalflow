import type { AppLanguage } from "@/lib/i18n";

export const growthCopy = {
  AR: {
    growth: "النمو", rewards: "المكافآت", offers: "العروض", campaigns: "الحملات", recovery: "الاستعادة",
    simple: "عرض مبسط", advanced: "إدارة متقدمة", viewOnly: "عرض فقط", back: "العودة للنشاط",
    scanNote: "تتم عمليات الكسب والاستبدال من شاشة المسح فقط.",
    noItems: "لا توجد بيانات مطابقة بعد.", preparing: "تحضير يدوي", export: "تصدير CSV",
  },
  EN: {
    growth: "Growth", rewards: "Rewards", offers: "Offers", campaigns: "Campaigns", recovery: "Recovery",
    simple: "Simple view", advanced: "Advanced management", viewOnly: "View only", back: "Back to business",
    scanNote: "Earning and redemption remain in the Scan flow.",
    noItems: "There is no matching data yet.", preparing: "Manual preparation", export: "Export CSV",
  },
} as const;

export function getGrowthCopy(language: AppLanguage) {
  return growthCopy[language];
}
