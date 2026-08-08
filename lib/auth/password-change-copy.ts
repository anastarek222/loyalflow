import type { AppLanguage } from "@/lib/i18n";

export type PasswordChangeError =
  | "invalid"
  | "incorrect-current-password"
  | "throttled"
  | "failed";

const passwordChangeCopy = {
  AR: {
    eyebrow: "أمان الحساب",
    title: "تغيير كلمة المرور",
    description:
      "بعد نجاح التغيير، سيتم إنهاء جميع جلساتك الحالية وستحتاج إلى تسجيل الدخول بكلمة المرور الجديدة.",
    sectionTitle: "كلمة المرور",
    sectionDescription: "أدخل كلمة المرور الحالية للتأكد من هويتك.",
    currentPassword: "كلمة المرور الحالية",
    newPassword: "كلمة المرور الجديدة",
    confirmNewPassword: "تأكيد كلمة المرور الجديدة",
    passwordHelp: "استخدم 10 أحرف على الأقل.",
    submit: "تغيير كلمة المرور",
    submitting: "جارٍ تغيير كلمة المرور…",
    invalid:
      "راجع كلمة المرور الجديدة وتأكيدها. يجب أن تتكون من 10 أحرف على الأقل وأن تتطابق القيمتان.",
    incorrectCurrentPassword:
      "تعذر تغيير كلمة المرور. راجع كلمة المرور الحالية وحاول مرة أخرى.",
    throttled:
      "تعذر تغيير كلمة المرور الآن. انتظر قليلًا ثم حاول مرة أخرى.",
    failed:
      "تعذر تغيير كلمة المرور بأمان. أعد تحميل الصفحة وحاول مرة أخرى.",
    success:
      "تم تغيير كلمة المرور وإنهاء جلساتك الحالية. سجّل الدخول بكلمة المرور الجديدة.",
  },
  EN: {
    eyebrow: "Account security",
    title: "Change password",
    description:
      "After the change succeeds, all current sessions will end and you will need to sign in with the new password.",
    sectionTitle: "Password",
    sectionDescription: "Enter your current password to confirm your identity.",
    currentPassword: "Current password",
    newPassword: "New password",
    confirmNewPassword: "Confirm new password",
    passwordHelp: "Use at least 10 characters.",
    submit: "Change password",
    submitting: "Changing password…",
    invalid:
      "Review the new password and its confirmation. It must be at least 10 characters and both values must match.",
    incorrectCurrentPassword:
      "The password could not be changed. Review the current password and try again.",
    throttled:
      "The password cannot be changed right now. Wait a little and try again.",
    failed:
      "The password could not be changed safely. Reload the page and try again.",
    success:
      "Your password was changed and your current sessions ended. Sign in with your new password.",
  },
} satisfies Record<AppLanguage, Record<string, string>>;

export function getPasswordChangeCopy(language: AppLanguage) {
  return passwordChangeCopy[language];
}

export function getPasswordChangeErrorMessage(
  language: AppLanguage,
  error: PasswordChangeError,
) {
  const copy = getPasswordChangeCopy(language);

  if (error === "incorrect-current-password") {
    return copy.incorrectCurrentPassword;
  }

  return copy[error];
}
