import { commonMessages } from "@loyalflow/i18n/common";
import { DEFAULT_LOCALE, type SupportedLocale } from "./config";

export const messages = {
  en: {
    ...commonMessages.en,
    "auth.signIn": "Sign in",
    "auth.signInWorkspace": "Sign in to your workspace",
    "auth.email": "Email address",
    "auth.password": "Password",
    "auth.forgotPassword": "Forgot password?",
    "auth.secureWorkspace": "Secure LoyalFlow workspace",
    "auth.emailPlaceholder": "name@company.com",
    "auth.passwordPlaceholder": "Enter your password",
    "auth.signingIn": "Checking account…",
    "auth.invalid": "The sign-in details or security code are incorrect.",
    "auth.welcomeBack": "Welcome back",
    "auth.signInBody":
      "Use the same sign-in for every LoyalFlow role. We will route you to the right workspace securely.",
    "auth.backHome": "Back to homepage",
    "auth.protectedAccess": "Protected workspace access",
    "auth.workspaceReadyTitle": "Your loyalty workspace is ready when you are.",
    "auth.workspaceReadyBody":
      "Return to the place where your team runs customers, rewards, branches, and daily loyalty activity.",
    "auth.benefitCustomers": "Customer activity in one connected view",
    "auth.benefitRewards": "Clear reward progress and operations",
    "auth.benefitRoles": "Access that follows each team member’s role",
    "auth.mfaTitle": "One more security step",
    "auth.mfaBody":
      "Enter the current code from your authenticator app or use one of your recovery codes.",
    "auth.mfaLabel": "Security code",
    "auth.mfaPlaceholder": "123456 or recovery code",
    "auth.verify": "Verify and continue",
    "auth.verifying": "Verifying…",
    "auth.back": "Back to sign in",
    "auth.mfaSetupTitle": "Secure setup required",
    "auth.mfaSetupBody":
      "Your credentials are correct, but this account must finish multi-factor authentication setup before access is allowed.",
    "auth.mfaSetupCta": "Set up secure access",
    "auth.resendVerification": "Need a new verification email?",
    "auth.noRoleSelection":
      "No role selection is needed. LoyalFlow opens the correct experience after secure sign-in.",
    "auth.passwordResetSuccess":
      "Your password has been updated. Sign in with your new password.",
    "auth.verificationSuccess":
      "Your email has been verified. You can sign in now.",
    "auth.mfaEnabledSuccess":
      "Multi-factor authentication is enabled. Sign in to continue.",
    "marketing.metaTitle":
      "LoyalFlow | Loyalty operations for growing businesses",
    "marketing.metaDescription":
      "Manage loyalty programs, rewards, customers, branches, teams, and reporting from one secure workspace.",
    "marketing.badge": "Loyalty operations, without the spreadsheet chaos",
    "marketing.heroTitle":
      "Run loyalty, rewards, customers, and staff from one workspace.",
    "marketing.heroBody":
      "LoyalFlow gives growing businesses one secure place to manage loyalty programs, customer activity, rewards, branches, teams, and reporting.",
    "marketing.primaryCta": "Choose how to get started",
    "marketing.invitationCta": "Accept an owner invitation",
    "marketing.trustLine":
      "Built for owners, staff, and customer-facing teams with tenant-safe access controls.",
    "marketing.featureOneTitle": "Operate loyalty daily",
    "marketing.featureOneBody":
      "Scan customers, earn and redeem rewards, and keep a clear activity trail.",
    "marketing.featureTwoTitle": "Know your customers",
    "marketing.featureTwoBody":
      "Use customer profiles, segments, reports, and recovery workflows without mixing tenant data.",
    "marketing.featureThreeTitle": "Grow with structure",
    "marketing.featureThreeBody":
      "Manage branches, staff access, offers, campaigns, and program rules from one controlled workspace.",
    "marketing.workflowTitle": "A simple operating flow",
    "marketing.workflowOne": "Set up your business and loyalty program.",
    "marketing.workflowTwo": "Invite your team and run customer operations.",
    "marketing.workflowThree":
      "Track results and improve retention with reports and campaigns.",
    "marketing.navProduct": "Product",
    "marketing.navIndustries": "Industries",
    "marketing.navSecurity": "Security",
    "marketing.navFaq": "FAQ",
    "marketing.menuOpen": "Open navigation menu",
    "marketing.menuClose": "Close navigation menu",
    "marketing.secondaryCta": "See how it works",
    "marketing.previewLabel": "LoyalFlow product preview",
    "marketing.previewDashboard": "Owner overview",
    "marketing.previewActiveCustomers": "Active customers",
    "marketing.previewRepeatRate": "Repeat rate",
    "marketing.previewActivity": "Latest activity",
    "marketing.previewCustomer": "Recorded",
    "marketing.previewVisits": "visit",
    "marketing.previewReward": "Next reward",
    "marketing.previewReadySoon": "One visit to reward",
    "marketing.trustArabic": "Arabic + English",
    "marketing.trustQr": "QR-based cards",
    "marketing.trustNoApp": "No customer app required",
    "marketing.trustRoles": "Role-aware access",
    "marketing.howEyebrow": "How it works",
    "marketing.howTitle": "From setup to repeat visits in three clear steps.",
    "marketing.featuresEyebrow": "One connected workspace",
    "marketing.featuresTitle":
      "Daily loyalty operations without disconnected tools.",
    "marketing.featuresBody":
      "Give each role the right view while customer activity, rewards, branches, and reporting stay connected.",
    "marketing.industriesEyebrow": "Built for everyday businesses",
    "marketing.industriesTitle":
      "Flexible enough for the way your customers return.",
    "marketing.industryCafe": "Cafés & restaurants",
    "marketing.industryCafeBody":
      "Visits, points, or spend-based rewards for regular guests.",
    "marketing.industryBeauty": "Barbers & beauty",
    "marketing.industryBeautyBody":
      "Simple visit programs and service rewards your team can run quickly.",
    "marketing.industryRetail": "Fashion & retail",
    "marketing.industryRetailBody":
      "Customer profiles, offers, and loyalty value across repeat purchases.",
    "marketing.industryFitness": "Gyms & studios",
    "marketing.industryFitnessBody":
      "Reward attendance and keep members engaged with clear progress.",
    "marketing.securityEyebrow": "Designed for trust",
    "marketing.securityTitle": "Simple for the team. Serious about control.",
    "marketing.securityBody":
      "LoyalFlow separates every business workspace, keeps an activity trail, and shows sensitive loyalty actions clearly before they are confirmed.",
    "marketing.securityRoles": "Permissions follow each user’s real role.",
    "marketing.securityAudit":
      "Earn, redeem, adjustment, and reversal activity remains traceable.",
    "marketing.securityMfa":
      "Platform administration is protected with multi-factor authentication.",
    "marketing.faqEyebrow": "Frequently asked questions",
    "marketing.faqTitle": "The essentials before you get started.",
    "marketing.faqOneQuestion": "Do customers need to install an app?",
    "marketing.faqOneAnswer":
      "No. Customers can open their digital loyalty card from a secure link or QR code in their browser.",
    "marketing.faqTwoQuestion": "Can staff access all business settings?",
    "marketing.faqTwoAnswer":
      "No. LoyalFlow uses role-aware permissions so owners, managers, staff, and viewers see the tools appropriate to their work.",
    "marketing.faqThreeQuestion": "Does LoyalFlow support Arabic?",
    "marketing.faqThreeAnswer":
      "Yes. The product supports Arabic RTL and English LTR across the core owner, staff, and customer experiences.",
    "marketing.finalTitle": "Ready to make every return visit count?",
    "marketing.finalBody":
      "Choose the supported setup path for your workspace, or sign in if your account is already active.",
    "marketing.footerProduct": "Product",
    "marketing.footerAccess": "Access",
    "marketing.footerNote":
      "Bilingual loyalty operations for growing businesses.",
    "conversion.metaTitle": "Get started | LoyalFlow",
    "conversion.metaDescription":
      "Choose the supported LoyalFlow path for an existing account or an owner invitation.",
    "conversion.eyebrow": "Get started",
    "conversion.title": "Choose the LoyalFlow path that matches your account.",
    "conversion.body":
      "LoyalFlow currently supports existing workspace access and secure owner invitation acceptance. Choose the path that matches how your account was created.",
    "conversion.existingTitle": "I already have a LoyalFlow account",
    "conversion.existingBody":
      "Sign in to your existing workspace. Pending owners are routed to their private setup flow automatically.",
    "conversion.existingCta": "Sign in",
    "conversion.invitedTitle": "I received an owner invitation",
    "conversion.invitedBody":
      "Open the invitation acceptance flow and use the secure invitation token from your email.",
    "conversion.invitedCta": "Accept owner invitation",
    "conversion.noSignup":
      "Public self-signup and payment checkout are not enabled in this release, so this page does not create a new unsupported account path.",
    "conversion.backHome": "Back to homepage",
    "onboarding.metaTitle": "Owner onboarding | LoyalFlow",
    "onboarding.metaDescription":
      "Complete the private LoyalFlow owner setup flow.",
    "onboarding.eyebrow": "Owner setup",
    "onboarding.title": "Set up your LoyalFlow workspace",
    "onboarding.description":
      "Complete your business profile, loyalty program, rewards, branding, and card setup before launch.",
    "onboarding.privateNote":
      "This setup is private to your account and is not indexed by search engines.",
  },
  ar: {
    ...commonMessages.ar,
    "auth.signIn": "تسجيل الدخول",
    "auth.signInWorkspace": "سجّل الدخول إلى مساحة العمل الخاصة بك",
    "auth.email": "البريد الإلكتروني",
    "auth.password": "كلمة المرور",
    "auth.forgotPassword": "هل نسيت كلمة المرور؟",
    "auth.secureWorkspace": "مساحة عمل LoyalFlow آمنة",
    "auth.emailPlaceholder": "name@company.com",
    "auth.passwordPlaceholder": "أدخل كلمة المرور",
    "auth.signingIn": "جارٍ التحقق من الحساب…",
    "auth.invalid": "بيانات تسجيل الدخول أو رمز الأمان غير صحيحة.",
    "auth.welcomeBack": "مرحبًا بعودتك",
    "auth.signInBody":
      "استخدم نفس تسجيل الدخول لكل أدوار LoyalFlow، وسنوجّهك بأمان إلى مساحة العمل المناسبة.",
    "auth.backHome": "العودة إلى الصفحة الرئيسية",
    "auth.protectedAccess": "دخول محمي إلى مساحة العمل",
    "auth.workspaceReadyTitle":
      "مساحة الولاء الخاصة بك جاهزة عندما تكون جاهزًا.",
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
    "auth.noRoleSelection":
      "لا تحتاج إلى اختيار دورك؛ يفتح LoyalFlow التجربة المناسبة بعد تسجيل الدخول الآمن.",
    "auth.passwordResetSuccess":
      "تم تحديث كلمة المرور. سجّل الدخول باستخدام كلمة المرور الجديدة.",
    "auth.verificationSuccess":
      "تم تأكيد بريدك الإلكتروني. يمكنك تسجيل الدخول الآن.",
    "auth.mfaEnabledSuccess":
      "تم تفعيل المصادقة متعددة العوامل. سجّل الدخول للمتابعة.",
    "marketing.metaTitle": "LoyalFlow | تشغيل برامج الولاء للشركات المتنامية",
    "marketing.metaDescription":
      "أدر برامج الولاء والمكافآت والعملاء والفروع والفرق والتقارير من مساحة عمل آمنة واحدة.",
    "marketing.badge": "شغّل برنامج الولاء بدون فوضى الجداول",
    "marketing.heroTitle":
      "أدر الولاء والمكافآت والعملاء والفريق من مساحة عمل واحدة.",
    "marketing.heroBody":
      "LoyalFlow يوفّر للشركات المتنامية مكانًا آمنًا واحدًا لإدارة برامج الولاء ونشاط العملاء والمكافآت والفروع والفرق والتقارير.",
    "marketing.primaryCta": "اختر طريقة البدء",
    "marketing.invitationCta": "قبول دعوة مالك",
    "marketing.trustLine":
      "مصمم للمالكين والموظفين وفرق خدمة العملاء مع صلاحيات آمنة ومعزولة لكل نشاط.",
    "marketing.featureOneTitle": "شغّل الولاء يوميًا",
    "marketing.featureOneBody":
      "امسح بطاقات العملاء وأضف واستخدم المكافآت مع سجل نشاط واضح.",
    "marketing.featureTwoTitle": "افهم عملاءك",
    "marketing.featureTwoBody":
      "استخدم ملفات العملاء والشرائح والتقارير ومسارات الاسترجاع بدون خلط بيانات الأنشطة.",
    "marketing.featureThreeTitle": "انمُ بنظام واضح",
    "marketing.featureThreeBody":
      "أدر الفروع وصلاحيات الفريق والعروض والحملات وقواعد البرنامج من مساحة عمل واحدة.",
    "marketing.workflowTitle": "مسار تشغيل بسيط",
    "marketing.workflowOne": "جهّز نشاطك وبرنامج الولاء.",
    "marketing.workflowTwo": "ادعُ فريقك وابدأ تشغيل عمليات العملاء.",
    "marketing.workflowThree":
      "تابع النتائج وحسّن الاحتفاظ بالعملاء عبر التقارير والحملات.",
    "marketing.navProduct": "المنتج",
    "marketing.navIndustries": "الأنشطة",
    "marketing.navSecurity": "الأمان",
    "marketing.navFaq": "الأسئلة الشائعة",
    "marketing.menuOpen": "فتح قائمة التنقل",
    "marketing.menuClose": "إغلاق قائمة التنقل",
    "marketing.secondaryCta": "شاهد كيف يعمل",
    "marketing.previewLabel": "معاينة منتج LoyalFlow",
    "marketing.previewDashboard": "نظرة المالك",
    "marketing.previewActiveCustomers": "العملاء النشطون",
    "marketing.previewRepeatRate": "معدل التكرار",
    "marketing.previewActivity": "أحدث نشاط",
    "marketing.previewCustomer": "تم التسجيل",
    "marketing.previewVisits": "زيارة",
    "marketing.previewReward": "المكافأة التالية",
    "marketing.previewReadySoon": "زيارة واحدة للمكافأة",
    "marketing.trustArabic": "العربية والإنجليزية",
    "marketing.trustQr": "بطاقات برمز QR",
    "marketing.trustNoApp": "لا يحتاج العميل إلى تطبيق",
    "marketing.trustRoles": "صلاحيات حسب الدور",
    "marketing.howEyebrow": "كيف يعمل",
    "marketing.howTitle": "من الإعداد إلى تكرار الزيارة في ثلاث خطوات واضحة.",
    "marketing.featuresEyebrow": "مساحة عمل مترابطة",
    "marketing.featuresTitle": "تشغيل الولاء يوميًا بدون أدوات منفصلة.",
    "marketing.featuresBody":
      "امنح كل دور الواجهة المناسبة، مع بقاء نشاط العملاء والمكافآت والفروع والتقارير مترابطة.",
    "marketing.industriesEyebrow": "مصمم للأنشطة اليومية",
    "marketing.industriesTitle": "مرن ليناسب الطريقة التي يعود بها عملاؤك.",
    "marketing.industryCafe": "المقاهي والمطاعم",
    "marketing.industryCafeBody":
      "مكافآت حسب الزيارات أو النقاط أو الإنفاق لعملائك الدائمين.",
    "marketing.industryBeauty": "الحلاقة والتجميل",
    "marketing.industryBeautyBody":
      "برامج زيارات ومكافآت خدمات بسيطة يشغّلها فريقك بسرعة.",
    "marketing.industryRetail": "الأزياء والتجزئة",
    "marketing.industryRetailBody":
      "ملفات عملاء وعروض وقيمة ولاء عبر عمليات الشراء المتكررة.",
    "marketing.industryFitness": "الصالات والاستوديوهات",
    "marketing.industryFitnessBody":
      "كافئ الحضور وحافظ على تفاعل الأعضاء من خلال تقدم واضح.",
    "marketing.securityEyebrow": "مصمم للثقة",
    "marketing.securityTitle": "بسيط للفريق. جاد في التحكم.",
    "marketing.securityBody":
      "يفصل LoyalFlow مساحة كل نشاط، ويحفظ سجل النشاط، ويعرض عمليات الولاء الحساسة بوضوح قبل تأكيدها.",
    "marketing.securityRoles": "الصلاحيات تتبع الدور الحقيقي لكل مستخدم.",
    "marketing.securityAudit":
      "تظل عمليات الإضافة والاستخدام والتعديل والعكس قابلة للتتبع.",
    "marketing.securityMfa": "إدارة المنصة محمية بالمصادقة متعددة العوامل.",
    "marketing.faqEyebrow": "الأسئلة الشائعة",
    "marketing.faqTitle": "الأساسيات قبل أن تبدأ.",
    "marketing.faqOneQuestion": "هل يحتاج العملاء إلى تثبيت تطبيق؟",
    "marketing.faqOneAnswer":
      "لا. يمكن للعميل فتح بطاقة الولاء الرقمية من رابط آمن أو رمز QR في المتصفح.",
    "marketing.faqTwoQuestion":
      "هل يستطيع الموظف الوصول إلى كل إعدادات النشاط؟",
    "marketing.faqTwoAnswer":
      "لا. يستخدم LoyalFlow صلاحيات حسب الدور، ليشاهد المالك والمدير والموظف والمشاهد الأدوات المناسبة لعملهم.",
    "marketing.faqThreeQuestion": "هل يدعم LoyalFlow اللغة العربية؟",
    "marketing.faqThreeAnswer":
      "نعم. يدعم المنتج العربية من اليمين إلى اليسار والإنجليزية من اليسار إلى اليمين في تجارب المالك والموظف والعميل الأساسية.",
    "marketing.finalTitle": "هل أنت جاهز لتجعل كل زيارة عائدة ذات قيمة؟",
    "marketing.finalBody":
      "اختر مسار الإعداد المدعوم لمساحة عملك، أو سجّل الدخول إذا كان حسابك مفعّلًا بالفعل.",
    "marketing.footerProduct": "المنتج",
    "marketing.footerAccess": "الوصول",
    "marketing.footerNote": "تشغيل ولاء ثنائي اللغة للشركات المتنامية.",
    "conversion.metaTitle": "ابدأ | LoyalFlow",
    "conversion.metaDescription":
      "اختر مسار LoyalFlow المدعوم لحساب موجود أو لدعوة مالك.",
    "conversion.eyebrow": "ابدأ الآن",
    "conversion.title": "اختر مسار LoyalFlow المناسب لحسابك.",
    "conversion.body":
      "يدعم LoyalFlow حاليًا الدخول إلى مساحة عمل موجودة وقبول دعوة مالك آمنة. اختر المسار الذي يطابق طريقة إنشاء حسابك.",
    "conversion.existingTitle": "لدي حساب LoyalFlow بالفعل",
    "conversion.existingBody":
      "سجّل الدخول إلى مساحة العمل الحالية. يتم توجيه المالك المعلّق تلقائيًا إلى مسار الإعداد الخاص به.",
    "conversion.existingCta": "تسجيل الدخول",
    "conversion.invitedTitle": "وصلتني دعوة مالك",
    "conversion.invitedBody":
      "افتح مسار قبول الدعوة واستخدم رمز الدعوة الآمن الموجود في البريد الإلكتروني.",
    "conversion.invitedCta": "قبول دعوة المالك",
    "conversion.noSignup":
      "التسجيل الذاتي العام والدفع غير مفعّلين في هذا الإصدار، لذلك لا تنشئ هذه الصفحة مسار حساب جديد غير مدعوم.",
    "conversion.backHome": "العودة للصفحة الرئيسية",
    "onboarding.metaTitle": "إعداد المالك | LoyalFlow",
    "onboarding.metaDescription": "أكمل إعداد المالك الخاص بك في LoyalFlow.",
    "onboarding.eyebrow": "إعداد المالك",
    "onboarding.title": "جهّز مساحة عمل LoyalFlow الخاصة بك",
    "onboarding.description":
      "أكمل بيانات النشاط وبرنامج الولاء والمكافآت والهوية والبطاقة قبل الإطلاق.",
    "onboarding.privateNote":
      "هذا الإعداد خاص بحسابك ولا تتم فهرسته في محركات البحث.",
  },
} as const;

export type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

type LocaleCatalog = Record<MessageKey, string>;

const catalogs: Record<SupportedLocale, LocaleCatalog> = messages;

export function translate(locale: SupportedLocale, key: MessageKey): string {
  return catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];
}
