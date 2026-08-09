import { DEFAULT_LOCALE, type SupportedLocale } from "./config";

export const messages = {
  en: {
    "common.brand": "LoyalFlow",
    "common.continue": "Continue",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.language": "Language",
    "common.english": "English",
    "common.arabic": "العربية",
    "common.switchToArabic": "تغيير اللغة إلى العربية",
    "common.switchToEnglish": "Change language to English",
    "auth.signIn": "Sign in",
    "auth.signInWorkspace": "Sign in to your workspace",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password?",
    "auth.secureWorkspace": "Secure LoyalFlow workspace",
    "marketing.badge": "Loyalty operations, without the spreadsheet chaos",
    "marketing.heroTitle": "Run loyalty, rewards, customers, and staff from one workspace.",
    "marketing.heroBody": "LoyalFlow gives growing businesses one secure place to manage loyalty programs, customer activity, rewards, branches, teams, and reporting.",
    "marketing.primaryCta": "Sign in to LoyalFlow",
    "marketing.invitationCta": "Accept an owner invitation",
    "marketing.trustLine": "Built for owners, staff, and customer-facing teams with tenant-safe access controls.",
    "marketing.featureOneTitle": "Operate loyalty daily",
    "marketing.featureOneBody": "Scan customers, earn and redeem rewards, and keep a clear activity trail.",
    "marketing.featureTwoTitle": "Know your customers",
    "marketing.featureTwoBody": "Use customer profiles, segments, reports, and recovery workflows without mixing tenant data.",
    "marketing.featureThreeTitle": "Grow with structure",
    "marketing.featureThreeBody": "Manage branches, staff access, offers, campaigns, and program rules from one controlled workspace.",
    "marketing.workflowTitle": "A simple operating flow",
    "marketing.workflowOne": "Set up your business and loyalty program.",
    "marketing.workflowTwo": "Invite your team and run customer operations.",
    "marketing.workflowThree": "Track results and improve retention with reports and campaigns.",
  },
  ar: {
    "common.brand": "LoyalFlow",
    "common.continue": "متابعة",
    "common.cancel": "إلغاء",
    "common.save": "حفظ",
    "common.language": "اللغة",
    "common.english": "English",
    "common.arabic": "العربية",
    "common.switchToArabic": "تغيير اللغة إلى العربية",
    "common.switchToEnglish": "Change language to English",
    "auth.signIn": "تسجيل الدخول",
    "auth.signInWorkspace": "سجّل الدخول إلى مساحة العمل الخاصة بك",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.forgotPassword": "هل نسيت كلمة المرور؟",
    "auth.secureWorkspace": "مساحة عمل LoyalFlow آمنة",
    "marketing.badge": "شغّل برنامج الولاء بدون فوضى الجداول",
    "marketing.heroTitle": "أدر الولاء والمكافآت والعملاء والفريق من مساحة عمل واحدة.",
    "marketing.heroBody": "LoyalFlow يوفّر للشركات المتنامية مكانًا آمنًا واحدًا لإدارة برامج الولاء ونشاط العملاء والمكافآت والفروع والفرق والتقارير.",
    "marketing.primaryCta": "تسجيل الدخول إلى LoyalFlow",
    "marketing.invitationCta": "قبول دعوة مالك",
    "marketing.trustLine": "مصمم للمالكين والموظفين وفرق خدمة العملاء مع صلاحيات آمنة ومعزولة لكل نشاط.",
    "marketing.featureOneTitle": "شغّل الولاء يوميًا",
    "marketing.featureOneBody": "امسح بطاقات العملاء وأضف واستخدم المكافآت مع سجل نشاط واضح.",
    "marketing.featureTwoTitle": "افهم عملاءك",
    "marketing.featureTwoBody": "استخدم ملفات العملاء والشرائح والتقارير ومسارات الاسترجاع بدون خلط بيانات الأنشطة.",
    "marketing.featureThreeTitle": "انمُ بنظام واضح",
    "marketing.featureThreeBody": "أدر الفروع وصلاحيات الفريق والعروض والحملات وقواعد البرنامج من مساحة عمل واحدة.",
    "marketing.workflowTitle": "مسار تشغيل بسيط",
    "marketing.workflowOne": "جهّز نشاطك وبرنامج الولاء.",
    "marketing.workflowTwo": "ادعُ فريقك وابدأ تشغيل عمليات العملاء.",
    "marketing.workflowThree": "تابع النتائج وحسّن الاحتفاظ بالعملاء عبر التقارير والحملات.",
  },
} as const;

export type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

type LocaleCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, LocaleCatalog> = messages;

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
}
