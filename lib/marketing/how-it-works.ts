import type { SupportedLocale } from "@/lib/i18n/config";

export const MARKETING_HOW_IT_WORKS_TRIAL_DAYS = 14;

export type HowItWorksStepId =
  "setup" | "join" | "activity" | "progress" | "reward" | "relationship";

export type HowItWorksStep = {
  id: HowItWorksStepId;
  shortTitle: string;
  title: string;
  body: string;
  bullets: readonly string[];
};

type HowItWorksCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  trialNote: string;
  previewLabel: string;
  previewTitle: string;
  journeyTitle: string;
  journeyBody: string;
  stepLabel: string;
  steps: readonly HowItWorksStep[];
  businessView: string;
  customerView: string;
  customerContext: string;
  activityHistory: string;
  progressRewards: string;
  engagementSignals: string;
  customerExperienceTitle: string;
  businessExperienceTitle: string;
  balanceTitle: string;
  balanceBody: string;
  teamEyebrow: string;
  teamTitle: string;
  teamBody: string;
  teamSteps: readonly { title: string; body: string }[];
  controlTitle: string;
  controlBody: string;
  controlPoints: readonly string[];
  faqTitle: string;
  faqs: readonly { question: string; answer: string }[];
  finalEyebrow: string;
  finalTitle: string;
  finalBody: string;
};

const copy: Record<SupportedLocale, HowItWorksCopy> = {
  en: {
    metaTitle: "How Tanee Works | One connected loyalty journey",
    metaDescription:
      "See how Tanee connects loyalty setup, customer joining, eligible activity, progress, rewards and relationship context in one clear journey.",
    eyebrow: "How Tanee works",
    title: "From the first interaction to a relationship that keeps growing.",
    body: "Tanee gives your business one clear loyalty process: welcome each customer, record eligible activity, show their progress and reward their continued loyalty through an experience that carries your brand.",
    primaryCta: "Start your free trial",
    secondaryCta: "Explore Tanee features",
    trialNote: "14 days free · No payment required · Clear, supported setup",
    previewLabel: "Connected loyalty journey",
    previewTitle: "Every step stays connected",
    journeyTitle: "One connected journey for your business and your customers.",
    journeyBody:
      "Each step builds on the one before it, so the customer experience stays simple while your business gains a clearer view of every relationship.",
    stepLabel: "Step",
    steps: [
      {
        id: "setup",
        shortTitle: "Set up",
        title: "Shape the loyalty experience around your business.",
        body: "Add your business details, choose how eligible customer activity creates progress, define suitable rewards and prepare a loyalty card that reflects your identity within Tanee’s approved card controls.",
        bullets: [
          "Add the essential details of your business",
          "Choose visits, points or sales-based progress",
          "Define rewards that suit your programme",
          "Choose an approved card theme and brand treatment",
        ],
      },
      {
        id: "join",
        shortTitle: "Customer joins",
        title: "Your customer joins through a clear, branded experience.",
        body: "Customers join through your business QR journey. Their digital loyalty card and progress remain easy to access without requiring a separate customer app.",
        bullets: [
          "A simple QR joining experience",
          "A digital card connected to your business",
          "Clear customer information and progress",
          "No separate customer app required",
        ],
      },
      {
        id: "activity",
        shortTitle: "Activity is recorded",
        title:
          "Every eligible interaction builds on the customer relationship.",
        body: "When your team records an eligible visit, points activity or sales amount, Tanee updates the customer’s history and progress inside the loyalty programme.",
        bullets: [
          "Record eligible customer activity",
          "Keep the activity history organised",
          "Update progress consistently",
          "Maintain one clear relationship record",
        ],
      },
      {
        id: "progress",
        shortTitle: "Progress is visible",
        title:
          "Customers can see that their continued loyalty is leading somewhere.",
        body: "Customers see clear progress on their card, while your team sees the activity and context behind it instead of treating every interaction as a new beginning.",
        bullets: [
          "Visible balance and progress",
          "Clear next-reward context",
          "Organised activity history",
          "The same trusted status for customer and team",
        ],
      },
      {
        id: "reward",
        shortTitle: "Loyalty is rewarded",
        title: "Deliver rewards in a way that makes sense for your business.",
        body: "You choose the rewards and their eligibility rules. Tanee keeps availability and redemption status clear for both your team and your customer.",
        bullets: [
          "Choose rewards that support your programme",
          "Define clear eligibility conditions",
          "Keep reward availability understandable",
          "Record redemption through the controlled workflow",
        ],
      },
      {
        id: "relationship",
        shortTitle: "Relationship grows",
        title: "See how each customer relationship develops over time.",
        body: "Tanee connects customer information, eligible activity, progress and rewards in one view, helping your team understand continued engagement and where attention may be useful.",
        bullets: [
          "One organised customer profile",
          "Clear activity and progress history",
          "Reward and programme context",
          "Useful engagement and recency signals",
        ],
      },
    ],
    businessView: "What the business sees",
    customerView: "What the customer sees",
    customerContext: "Customer context",
    activityHistory: "Activity history",
    progressRewards: "Progress & rewards",
    engagementSignals: "Engagement signals",
    customerExperienceTitle: "Simple for the customer.",
    businessExperienceTitle: "Clear for the business.",
    balanceTitle: "One experience, two useful views.",
    balanceBody:
      "The customer gets an uncomplicated loyalty journey. Your business gets the context and controls needed to operate it consistently.",
    teamEyebrow: "Everyday operations",
    teamTitle: "A loyalty process your team can follow consistently.",
    teamBody:
      "Tanee keeps the important actions connected, so your team can welcome customers, record activity and manage rewards without turning loyalty into a complicated daily task.",
    teamSteps: [
      {
        title: "Welcome & identify",
        body: "Find the customer through the approved scan or customer lookup flow.",
      },
      {
        title: "Record activity",
        body: "Add the eligible visit, points activity or sales amount.",
      },
      {
        title: "Confirm status",
        body: "Review updated progress and any reward that is ready.",
      },
      {
        title: "Continue relationship",
        body: "Keep the new activity in the customer profile for the next return.",
      },
    ],
    controlTitle:
      "Your programme and customer relationships remain under your control.",
    controlBody:
      "Your business manages how the loyalty programme operates, while Tanee keeps customer information and programme activity inside the product’s role-aware, tenant-isolated experience.",
    controlPoints: [
      "Programme settings stay with authorised team members",
      "Customer records remain separated by business",
      "Activity and redemption actions keep a clear operational trail",
    ],
    faqTitle: "Frequently asked questions about how Tanee works",
    faqs: [
      {
        question: "How does a customer join my loyalty programme?",
        answer:
          "Customers can join through the QR journey connected to your business and receive access to their digital loyalty card.",
      },
      {
        question: "What customer activity can I record?",
        answer:
          "Your programme can use visits, points or eligible sales amounts, according to the programme mode you configure.",
      },
      {
        question: "How do customers make progress?",
        answer:
          "Each eligible activity updates progress according to your active programme rules and reward catalogue.",
      },
      {
        question: "Can I choose my own rewards?",
        answer:
          "Yes. Authorised business users can configure rewards and eligibility conditions that fit the programme.",
      },
      {
        question: "Can customers see their progress?",
        answer:
          "Yes. The digital loyalty card shows the customer’s current balance, progress and available reward context.",
      },
      {
        question: "What can my business understand from Tanee?",
        answer:
          "Your team can review customer profiles, activity, progress, rewards and reporting signals from one connected operating view.",
      },
    ],
    finalEyebrow: "Start today",
    finalTitle:
      "Make every eligible interaction part of a stronger customer relationship.",
    finalBody:
      "Set up a loyalty experience that carries your identity, keeps progress clear and gives customers another reason to choose your business.",
  },
  ar: {
    metaTitle: "كيف تعمل Tanee | رحلة ولاء واحدة مترابطة",
    metaDescription:
      "اكتشف كيف تربط Tanee بين إعداد برنامج الولاء وانضمام العميل وتسجيل النشاط والتقدم والمكافآت وسياق العلاقة في رحلة واضحة.",
    eyebrow: "كيف تعمل Tanee",
    title: "من أول تفاعل إلى علاقة تستمر في النمو.",
    body: "تمنح Tanee نشاطك مسار ولاء واحدًا وواضحًا: رحّب بكل عميل، وسجّل النشاط المؤهل، وأظهر تقدّمه، وكافئ استمراره من خلال تجربة تحمل هوية نشاطك.",
    primaryCta: "ابدأ تجربتك المجانية",
    secondaryCta: "اكتشف مزايا Tanee",
    trialNote: "14 يومًا مجانًا · بدون دفع · إعداد واضح ومدعوم",
    previewLabel: "رحلة ولاء مترابطة",
    previewTitle: "كل خطوة مرتبطة بما قبلها",
    journeyTitle: "رحلة واحدة مترابطة لنشاطك وعملائك.",
    journeyBody:
      "كل خطوة تبني على ما قبلها، لتظل تجربة العميل سهلة ويحصل نشاطك على صورة أوضح لكل علاقة.",
    stepLabel: "الخطوة",
    steps: [
      {
        id: "setup",
        shortTitle: "الإعداد",
        title: "أنشئ برنامج ولاء يناسب طريقة عمل نشاطك.",
        body: "أضف بيانات نشاطك، واختر كيف يصنع نشاط العميل المؤهل تقدّمًا، وحدد المكافآت المناسبة، وجهّز بطاقة ولاء تعكس هويتك ضمن خيارات البطاقة المعتمدة في Tanee.",
        bullets: [
          "أضف البيانات الأساسية لنشاطك",
          "اختر التقدم بالزيارات أو النقاط أو قيمة المبيعات",
          "حدد المكافآت المناسبة للبرنامج",
          "اختر ثيم البطاقة والمعالجة البصرية المعتمدة",
        ],
      },
      {
        id: "join",
        shortTitle: "انضمام العميل",
        title: "ينضم عميلك من خلال تجربة واضحة تحمل هوية نشاطك.",
        body: "ينضم العملاء عبر رحلة رمز QR الخاصة بنشاطك، وتظل بطاقة الولاء الرقمية والتقدّم سهلة الوصول من دون الحاجة إلى تطبيق منفصل للعميل.",
        bullets: [
          "انضمام سهل عبر رمز QR",
          "بطاقة رقمية مرتبطة بنشاطك",
          "معلومات وتقدّم واضحان للعميل",
          "لا يحتاج العميل إلى تطبيق منفصل",
        ],
      },
      {
        id: "activity",
        shortTitle: "تسجيل النشاط",
        title: "كل نشاط مؤهل يبني على علاقة العميل بنشاطك.",
        body: "عندما يسجّل فريقك زيارة مؤهلة أو نشاط نقاط أو قيمة مبيعات، تحدّث Tanee سجل العميل وتقدّمه داخل برنامج الولاء.",
        bullets: [
          "سجّل نشاط العميل المؤهل",
          "حافظ على سجل النشاط منظمًا",
          "حدّث التقدّم بصورة متسقة",
          "احتفظ بسجل واضح للعلاقة",
        ],
      },
      {
        id: "progress",
        shortTitle: "وضوح التقدّم",
        title: "يرى العملاء أن استمرارهم في الولاء يحقق تقدّمًا حقيقيًا.",
        body: "يرى العميل تقدّمه بوضوح على بطاقته، بينما يرى فريقك النشاط والسياق وراء هذا التقدّم بدلًا من التعامل مع كل تفاعل كبداية جديدة.",
        bullets: [
          "رصيد وتقدّم واضحان",
          "سياق واضح للمكافأة التالية",
          "سجل نشاط منظم",
          "الحالة نفسها الموثوقة للعميل والفريق",
        ],
      },
      {
        id: "reward",
        shortTitle: "مكافأة الولاء",
        title: "قدّم المكافآت بالطريقة الأنسب لنشاطك.",
        body: "أنت تختار المكافآت وقواعد استحقاقها، وتحافظ Tanee على وضوح حالة الإتاحة والاستخدام لفريقك وللعميل.",
        bullets: [
          "اختر مكافآت تدعم برنامجك",
          "حدد شروط استحقاق واضحة",
          "اجعل إتاحة المكافآت سهلة الفهم",
          "سجّل الاستخدام من خلال المسار المنضبط",
        ],
      },
      {
        id: "relationship",
        shortTitle: "نمو العلاقة",
        title: "تابع كيف تتطور علاقة كل عميل مع الوقت.",
        body: "تجمع Tanee معلومات العميل ونشاطه المؤهل وتقدّمه ومكافآته في عرض واحد، لتساعد فريقك على فهم الاستمرار ومعرفة العلاقات التي قد تحتاج إلى اهتمام.",
        bullets: [
          "ملف عميل واحد ومنظم",
          "سجل واضح للنشاط والتقدّم",
          "سياق المكافآت والبرنامج",
          "مؤشرات مفيدة للتفاعل وحداثة النشاط",
        ],
      },
    ],
    businessView: "ما يراه النشاط",
    customerView: "ما يراه العميل",
    customerContext: "سياق العميل",
    activityHistory: "سجل النشاط",
    progressRewards: "التقدّم والمكافآت",
    engagementSignals: "مؤشرات التفاعل",
    customerExperienceTitle: "سهلة للعميل.",
    businessExperienceTitle: "واضحة للنشاط.",
    balanceTitle: "تجربة واحدة، وعرضان مفيدان.",
    balanceBody:
      "يحصل العميل على رحلة ولاء بسيطة، ويحصل نشاطك على السياق وأدوات التحكم اللازمة لتشغيلها باستمرار.",
    teamEyebrow: "التشغيل اليومي",
    teamTitle: "مسار ولاء يستطيع فريقك تطبيقه باستمرار.",
    teamBody:
      "تربط Tanee الإجراءات المهمة، ليستطيع فريقك الترحيب بالعملاء وتسجيل النشاط وإدارة المكافآت من دون تحويل الولاء إلى مهمة يومية معقدة.",
    teamSteps: [
      {
        title: "الترحيب والتعرّف",
        body: "اعثر على العميل من خلال المسح المعتمد أو البحث عن العميل.",
      },
      {
        title: "تسجيل النشاط",
        body: "أضف الزيارة المؤهلة أو نشاط النقاط أو قيمة المبيعات.",
      },
      {
        title: "تأكيد الحالة",
        body: "راجع التقدّم المحدّث وأي مكافأة أصبحت جاهزة.",
      },
      {
        title: "استمرار العلاقة",
        body: "احتفظ بالنشاط الجديد في ملف العميل للزيارة التالية.",
      },
    ],
    controlTitle: "برنامج الولاء وعلاقات عملائك يظلان تحت سيطرتك.",
    controlBody:
      "يدير نشاطك طريقة عمل برنامج الولاء، بينما تحافظ Tanee على معلومات العملاء ونشاط البرنامج داخل تجربة معزولة لكل نشاط وتراعي صلاحيات الأدوار.",
    controlPoints: [
      "إعدادات البرنامج متاحة لأعضاء الفريق المصرح لهم",
      "سجلات العملاء تظل منفصلة بين الأنشطة",
      "إجراءات النشاط واستخدام المكافآت تحتفظ بسجل تشغيلي واضح",
    ],
    faqTitle: "أسئلة شائعة حول طريقة عمل Tanee",
    faqs: [
      {
        question: "كيف ينضم العميل إلى برنامج الولاء الخاص بنشاطي؟",
        answer:
          "ينضم العميل عبر رحلة رمز QR المرتبطة بنشاطك، ويحصل على الوصول إلى بطاقة الولاء الرقمية.",
      },
      {
        question: "ما أنواع نشاط العميل التي يمكنني تسجيلها؟",
        answer:
          "يمكن للبرنامج الاعتماد على الزيارات أو النقاط أو قيم المبيعات المؤهلة، بحسب وضع البرنامج الذي تختاره.",
      },
      {
        question: "كيف يحقق العملاء تقدّمًا؟",
        answer:
          "يحدّث كل نشاط مؤهل التقدّم وفق قواعد البرنامج النشطة وكتالوج المكافآت.",
      },
      {
        question: "هل يمكنني اختيار المكافآت بنفسي؟",
        answer:
          "نعم. يستطيع مستخدمو النشاط المصرح لهم إعداد المكافآت وشروط الاستحقاق المناسبة للبرنامج.",
      },
      {
        question: "هل يستطيع العملاء رؤية تقدّمهم؟",
        answer:
          "نعم. تعرض بطاقة الولاء الرقمية الرصيد الحالي والتقدّم وسياق المكافآت المتاحة للعميل.",
      },
      {
        question: "ما الذي تساعد Tanee نشاطي على فهمه؟",
        answer:
          "يستطيع فريقك مراجعة ملفات العملاء والنشاط والتقدّم والمكافآت ومؤشرات التقارير من عرض تشغيلي مترابط.",
      },
    ],
    finalEyebrow: "ابدأ اليوم",
    finalTitle: "اجعل كل نشاط مؤهل جزءًا من علاقة أقوى مع العميل.",
    finalBody:
      "أنشئ تجربة ولاء تحمل هويتك، وتحافظ على وضوح التقدّم، وتمنح عملاءك سببًا جديدًا لاختيار نشاطك.",
  },
};

export function getMarketingHowItWorksCopy(locale: SupportedLocale) {
  return copy[locale];
}
