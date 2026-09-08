import type { OwnerInviteMessageKey } from "../en/owner-invite";

export const arabicOwnerInviteMessages = {
  "ownerInvite.metaTitle": "أكمل إعداد نشاطك مع تاني",
  "ownerInvite.metaDescription": "تابع إعداد نشاطك بأمان مع تاني.",
  "ownerInvite.title": "عيّن كلمة المرور",
  "ownerInvite.body": "اختر كلمة مرور تاني لمتابعة إعداد نشاطك.",
  "ownerInvite.missing": "افتح الرابط الآمن من رسالة تاني لمتابعة إعداد نشاطك.",
  "ownerInvite.invalid": "رابط الإعداد الآمن غير صالح أو انتهت صلاحيته.",
  "ownerInvite.backLogin": "العودة لتسجيل الدخول",
  "ownerInvite.passwordMismatch": "كلمتا المرور غير متطابقتين.",
  "ownerInvite.passwordInvalid": "اختر كلمة مرور صالحة.",
  "ownerInvite.password": "كلمة المرور",
  "ownerInvite.confirmPassword": "تأكيد كلمة المرور",
  "ownerInvite.activate": "متابعة الإعداد",
} as const satisfies Record<OwnerInviteMessageKey, string>;
