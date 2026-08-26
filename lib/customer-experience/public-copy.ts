import { getLanguageAttributes, type AppLanguage } from "@/lib/i18n";

export type PublicExperienceCopy = {
  language: AppLanguage;
  lang: "ar" | "en";
  dir: "rtl" | "ltr";
  share: string;
  copyLink: string;
  copied: string;
  shareCancelled: string;
  shareFailed: string;
  install: string;
  installed: string;
  installHelpTitle: string;
  installHelpIntro: string;
  iosInstallSteps: readonly string[];
  androidInstallSteps: readonly string[];
  otherInstallHelp: string;
  close: string;
  qrUnavailable: string;
  qrAlternative: string;
};

/** Public copy always follows the business-owned card language. */
export function getPublicExperienceCopy(value: unknown): PublicExperienceCopy {
  const attributes = getLanguageAttributes(value);
  const ar = attributes.language === "AR";

  return {
    ...attributes,
    share: ar ? "مشاركة الكارت" : "Share card",
    copyLink: ar ? "نسخ الرابط" : "Copy link",
    copied: ar ? "تم نسخ الرابط" : "Link copied",
    shareCancelled: ar ? "تم إلغاء المشاركة" : "Sharing was cancelled",
    shareFailed: ar ? "تعذرت المشاركة. يمكنك نسخ الرابط بدلًا من ذلك." : "Unable to share. You can copy the link instead.",
    install: ar ? "إضافة للشاشة الرئيسية" : "Add to Home Screen",
    installed: ar ? "الكارت مضاف بالفعل" : "Card already added",
    installHelpTitle: ar ? "إضافة الكارت للشاشة الرئيسية" : "Add card to Home Screen",
    installHelpIntro: ar
      ? "اتبع الخطوات المناسبة لجهازك، وستظهر البطاقة كأيقونة مستقلة."
      : "Follow these steps and the card will appear as its own Home Screen icon.",
    iosInstallSteps: ar
      ? [
          "افتح صفحة الكارت في Safari.",
          "اضغط زر المشاركة في شريط Safari.",
          "مرر لأسفل واختر «إضافة إلى الشاشة الرئيسية»، ثم اضغط «إضافة».",
        ]
      : [
          "Open this card page in Safari.",
          "Tap the Share button in Safari's toolbar.",
          "Scroll down, choose “Add to Home Screen”, then tap “Add”.",
        ],
    androidInstallSteps: ar
      ? [
          "افتح صفحة الكارت في Chrome.",
          "اضغط قائمة ⋮ أعلى المتصفح.",
          "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية»، ثم أكد الإضافة.",
        ]
      : [
          "Open this card page in Chrome.",
          "Tap the ⋮ browser menu.",
          "Choose “Install app” or “Add to Home screen”, then confirm.",
        ],
    otherInstallHelp: ar ? "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا كانت متاحة." : "Open your browser menu and choose “Install app” or “Add to Home Screen” when available.",
    close: ar ? "إغلاق" : "Close",
    qrUnavailable: ar ? "تعذر إنشاء رمز QR الآن." : "The QR code is unavailable right now.",
    qrAlternative: ar ? "استخدم رابط الكارت للمسح أو المشاركة." : "Use the card link to open or share this card.",
  };
}
