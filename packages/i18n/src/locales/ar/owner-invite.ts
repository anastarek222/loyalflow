import type { OwnerInviteMessageKey } from "../en/owner-invite";

export const arabicOwnerInviteMessages = {
  "ownerInvite.metaTitle": "قبول دعوة المالك | Tanee Beta",
  "ownerInvite.metaDescription": "اقبل دعوة مالك آمنة في Tanee Beta.",
  "ownerInvite.title": "قبول دعوة المالك",
  "ownerInvite.body": "اختر كلمة مرور Tanee لتفعيل حساب المالك المدعو.",
  "ownerInvite.invalid": "رابط الدعوة غير صالح أو انتهت صلاحيته.",
  "ownerInvite.backLogin": "العودة لتسجيل الدخول",
  "ownerInvite.passwordMismatch": "كلمتا المرور غير متطابقتين.",
  "ownerInvite.passwordInvalid": "اختر كلمة مرور صالحة.",
  "ownerInvite.password": "كلمة المرور",
  "ownerInvite.confirmPassword": "تأكيد كلمة المرور",
  "ownerInvite.activate": "تفعيل حساب المالك",
} as const satisfies Record<OwnerInviteMessageKey, string>;
