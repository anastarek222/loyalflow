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
  "auth.resetRequestTitle": "إعادة تعيين كلمة المرور",
  "auth.resetRequestBody":
    "أدخل بريد حسابك وسنرسل إليك تعليمات إعادة تعيين كلمة المرور.",
  "auth.resetRequestSent":
    "إذا كان هناك حساب مؤهل بهذا البريد، فقد تم إرسال تعليمات إعادة تعيين كلمة المرور.",
  "auth.sendResetInstructions": "إرسال تعليمات إعادة التعيين",
  "auth.backSignIn": "العودة إلى تسجيل الدخول",
  "auth.chooseNewPassword": "اختر كلمة مرور جديدة",
  "auth.newPasswordRequirement":
    "يجب أن تتكون كلمة المرور الجديدة من 10 أحرف على الأقل.",
  "auth.resetLinkInvalid": "رابط إعادة التعيين غير صالح أو انتهت صلاحيته.",
  "auth.requestNewResetLink": "طلب رابط إعادة تعيين جديد",
  "auth.passwordMismatch": "كلمتا المرور غير متطابقتين.",
  "auth.passwordInvalid": "اختر كلمة مرور صالحة.",
  "auth.newPassword": "كلمة المرور الجديدة",
  "auth.confirmNewPassword": "تأكيد كلمة المرور الجديدة",
  "auth.updatePassword": "تحديث كلمة المرور",
  "auth.verifyEmailTitle": "تأكيد البريد الإلكتروني",
  "auth.verifyEmailInvalid":
    "رابط التأكيد غير صالح أو انتهت صلاحيته أو تم استخدامه بالفعل.",
  "auth.verifyEmailBody": "أكد عنوان البريد الإلكتروني هذا لإكمال التحقق.",
  "auth.verifyEmailCta": "تأكيد البريد الإلكتروني",
  "auth.resendVerificationTitle": "إعادة إرسال رسالة التأكيد",
  "auth.resendVerificationBody":
    "أدخل بريد حسابك. إذا كان مؤهلًا للتأكيد، فسنرسل رابطًا جديدًا.",
  "auth.resendVerificationSent":
    "إذا كان الحساب يحتاج إلى التأكيد، فقد تم طلب رسالة جديدة.",
  "auth.sendVerificationLink": "إرسال رابط التأكيد",
  "auth.superAdminSecurity": "أمان المشرف العام",
  "auth.setupMfaPageTitle": "إعداد المصادقة متعددة العوامل",
  "auth.setupMfaPageBody":
    "المصادقة متعددة العوامل مطلوبة لدخول المشرف العام. تحقق من حسابك، وأضف تاني إلى تطبيق المصادقة، واحفظ رموز الاسترداد أحادية الاستخدام.",
  "auth.superAdminEmail": "بريد المشرف العام",
  "auth.mfaStartError":
    "تعذر بدء إعداد المصادقة متعددة العوامل. تحقق من بيانات الدخول وحاول مرة أخرى.",
  "auth.mfaPreparing": "جارٍ تجهيز المصادقة…",
  "auth.mfaStart": "بدء إعداد المصادقة",
  "auth.mfaAddAuthenticator": "أضف تاني إلى تطبيق المصادقة",
  "auth.mfaAddAuthenticatorBody":
    "أدخل هذا المفتاح يدويًا في تطبيق المصادقة، ثم استخدم الرمز الحالي المكوّن من 6 أرقام أدناه.",
  "auth.mfaOpenAuthenticator": "فتح رابط تطبيق المصادقة",
  "auth.mfaRecoveryTitle": "احفظ رموز الاسترداد الآن",
  "auth.mfaRecoveryBody":
    "يعمل كل رمز مرة واحدة. خزّنها في مكان آمن قبل تأكيد الإعداد.",
  "auth.mfaSixDigitCode": "رمز المصادقة المكوّن من 6 أرقام",
  "auth.mfaConfirmError":
    "الرمز غير صالح أو انتهت نافذة الإعداد. أعد بدء إعداد المصادقة.",
  "auth.mfaEnabling": "جارٍ تفعيل المصادقة…",
  "auth.mfaEnable": "تفعيل المصادقة متعددة العوامل",
} as const satisfies Record<AuthMessageKey, string>;
