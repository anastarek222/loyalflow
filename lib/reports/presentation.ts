import type { AppLanguage } from "@/lib/i18n";

export function reportCopy(language: AppLanguage) {
  return language === "AR"
    ? {
        overview: "تقارير النشاط", staff: "أداء الفريق", export: "تصدير CSV", filters: "فلاتر التقرير",
        dateRange: "الفترة تشمل اليومين المحددين بتوقيت UTC.", apply: "تطبيق الفلاتر", reset: "إعادة ضبط",
        noData: "لا توجد بيانات ضمن هذه الفترة.", historical: "تحليل تاريخي", trends: "الاتجاهات اليومية",
        customerGrowth: "نمو العملاء", loyaltyTrend: "الولاء المكتسب والاستبدال", redemptions: "استبدالات المكافآت",
        earned: "مكتسب", redeemed: "مستبدل", customers: "عملاء", activity: "عمليات", summary: "ملخص الفترة",
        advanced: "تفاصيل وتحليلات موسعة", simple: "ملخص يومي واضح", exportUnavailable: "ليس لديك إذن تصدير البيانات.",
      }
    : {
        overview: "Business reports", staff: "Staff performance", export: "Export CSV", filters: "Report filters",
        dateRange: "The selected UTC dates are inclusive.", apply: "Apply filters", reset: "Reset",
        noData: "There is no data in this period.", historical: "Historical analysis", trends: "Daily trends",
        customerGrowth: "Customer growth", loyaltyTrend: "Loyalty earned and redeemed", redemptions: "Reward redemptions",
        earned: "Earned", redeemed: "Redeemed", customers: "Customers", activity: "Operations", summary: "Period summary",
        advanced: "Detailed historical analysis", simple: "A clear daily summary", exportUnavailable: "You do not have permission to export data.",
      };
}

export function safeReportNumber(value: number | null | undefined) {
  return Number.isFinite(value) ? value : 0;
}
