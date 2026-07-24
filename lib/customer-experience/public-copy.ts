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
  iosInstallHelp: string;
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
    iosInstallHelp: ar ? "في Safari، اضغط زر المشاركة ثم اختر «إضافة إلى الشاشة الرئيسية»." : "In Safari, tap Share, then choose “Add to Home Screen”.",
    otherInstallHelp: ar ? "افتح قائمة المتصفح واختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» إذا كانت متاحة." : "Open your browser menu and choose “Install app” or “Add to Home Screen” when available.",
    close: ar ? "إغلاق" : "Close",
    qrUnavailable: ar ? "تعذر إنشاء رمز QR الآن." : "The QR code is unavailable right now.",
    qrAlternative: ar ? "استخدم رابط الكارت للمسح أو المشاركة." : "Use the card link to open or share this card.",
  };
}
