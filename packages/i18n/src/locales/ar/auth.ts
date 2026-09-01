import type { AuthMessageKey } from "../en/auth";

export const arabicAuthMessages = {
  "auth.signIn": "تسجيل الدخول",
  "auth.signInWorkspace": "سجّل الدخول إلى مساحة العمل الخاصة بك",
  "auth.email": "البريد الإلكتروني",
  "auth.password": "كلمة المرور",
  "auth.forgotPassword": "هل نسيت كلمة المرور؟",
  "auth.secureWorkspace": "مساحة عمل تاني آمنة",
  "auth.emailPlaceholder": "name@company.com",
  "auth.passwordPlaceholder": "أدخل كلمة المرور",
  "auth.signingIn": "جارٍ التحقق من الحساب…",
  "auth.invalid": "بيانات تسجيل الدخول أو رمز الأمان غير صحيحة.",
  "auth.serviceUnavailable":
    "تسجيل الدخول غير متاح مؤقتًا. حاول مرة أخرى بعد قليل.",
  "auth.welcomeBack": "مرحبًا بعودتك",
  "auth.signInBody":
    "استخدم نفس تسجيل الدخول لكل أدوار تاني، وسنوجّهك بأمان إلى مساحة العمل المناسبة.",
  "auth.backHome": "العودة إلى الصفحة الرئيسية",
  "auth.protectedAccess": "دخول محمي إلى مساحة العمل",
  "auth.workspaceReadyTitle": "مساحة الولاء الخاصة بك جاهزة عندما تكون جاهزًا.",
  "auth.workspaceReadyBody":
    "عُد إلى المكان الذي يدير فيه فريقك العملاء والمكافآت والفروع ونشاط الولاء اليومي.",
  "auth.benefitCustomers": "نشاط العملاء في واجهة مترابطة واحدة",
  "auth.benefitRewards": "تقدّم واضح للمكافآت وعملياتها",
  "auth.benefitRoles": "وصول يتبع الدور الحقيقي لكل عضو في الفريق",
  "auth.mfaTitle": "خطوة أمان أخيرة",
  "auth.mfaBody":
    "أدخل الرمز الحالي من تطبيق المصادقة أو استخدم أحد رموز الاسترداد.",
  "auth.mfaLabel": "رمز الأمان",
  "auth.mfaPlaceholder": "123456 أو رمز الاسترداد",
  "auth.verify": "تحقق وتابع",
  "auth.verifying": "جارٍ التحقق…",
  "auth.back": "العودة لتسجيل الدخول",
  "auth.mfaSetupTitle": "يلزم إكمال إعداد الأمان",
  "auth.mfaSetupBody":
    "بياناتك صحيحة، لكن يجب إكمال إعداد المصادقة متعددة العوامل لهذا الحساب قبل السماح بالدخول.",
  "auth.mfaSetupCta": "إعداد الدخول الآمن",
  "auth.resendVerification": "هل تحتاج رسالة تحقق جديدة؟",
  "auth.verificationRequiredTitle": "أكّد بريدك الإلكتروني للمتابعة",
  "auth.verificationRequiredBody":
    "البريد وكلمة المرور صحيحان، لكن هذا الحساب ما زال يحتاج إلى تأكيد البريد الإلكتروني قبل فتح مساحة العمل.",
  "auth.verificationRequiredCta": "إرسال رابط تحقق جديد",
  "auth.noRoleSelection":
    "لا تحتاج إلى اختيار دورك؛ يفتح تاني التجربة المناسبة بعد تسجيل الدخول الآمن.",
  "auth.passwordResetSuccess":
    "تم تحديث كلمة المرور. سجّل الدخول باستخدام كلمة المرور الجديدة.",
  "auth.verificationSuccess":
    "تم تأكيد بريدك الإلكتروني. يمكنك تسجيل الدخول الآن.",
  "auth.mfaEnabledSuccess":
    "تم تفعيل المصادقة متعددة العوامل. سجّل الدخول للمتابعة.",
} as const satisfies Record<AuthMessageKey, string>;
