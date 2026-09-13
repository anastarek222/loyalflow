import type { SupportedLocale } from "@/lib/i18n/config";

export const MARKETING_ABOUT_TRIAL_DAYS = 14;

export type AboutPrincipleId = "problem" | "approach" | "outcome";

type MarketingAboutCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  body: string;
  primaryCta: string;
  secondaryCta: string;
  whoEyebrow: string;
  whoTitle: string;
  whoParagraphs: readonly string[];
  availability: string;
  whyEyebrow: string;
  whyTitle: string;
  whyBody: string;
  principles: readonly {
    id: AboutPrincipleId;
    label: string;
    title: string;
    body: string;
  }[];
  contactEyebrow: string;
  contactTitle: string;
  contactBody: string;
  contactLabels: Record<"email" | "whatsapp" | "phone", string>;
  finalEyebrow: string;
  finalTitle: string;
  finalBody: string;
  finalCta: string;
  trialNote: string;
};

const copy: Record<SupportedLocale, MarketingAboutCopy> = {
  en: {
    metaTitle: "About Tanee | A clearer loyalty experience",
    metaDescription:
      "Learn why Tanee brings customer activity, progress and rewards together in one clear loyalty experience for growing businesses.",
    eyebrow: "About Tanee",
    title:
      "We’re building a clearer way for businesses to grow lasting customer relationships.",
    body: "Tanee connects eligible customer activity, progress and rewards in one loyalty experience, helping businesses manage every relationship clearly instead of relying on disconnected tools.",
    primaryCta: "See how Tanee works",
    secondaryCta: "Talk to our team",
    whoEyebrow: "Who we are",
    whoTitle:
      "Tanee brings customer loyalty and everyday business operations closer together.",
    whoParagraphs: [
      "We’re building Tanee to make loyalty operations clearer for growing businesses and simpler for the customers they serve.",
      "Eligible activity, progress, rewards and customer context stay connected in one workflow instead of being scattered across cards, spreadsheets and manual follow-up.",
      "Each business controls its own programme and branded experience, with access and records organised around the people responsible for running it.",
    ],
    availability: "Built for growing businesses",
    whyEyebrow: "Why we built Tanee",
    whyTitle:
      "Loyalty should feel like a relationship, not another system to manage.",
    whyBody:
      "When customer information, eligible activity, progress and rewards live in different places, both the team and the customer lose the full picture. Tanee keeps that journey connected.",
    principles: [
      {
        id: "problem",
        label: "The problem",
        title: "One-time transactions hide the relationship behind them.",
        body: "Without connected context, each visit can feel like a new beginning and continued loyalty becomes harder to recognise.",
      },
      {
        id: "approach",
        label: "Our approach",
        title: "Keep every eligible loyalty interaction connected.",
        body: "Tanee brings customer context, activity, progress and rewards into one clear operating experience.",
      },
      {
        id: "outcome",
        label: "The outcome",
        title: "Give customers a clearer reason to return.",
        body: "Customers see meaningful progress while the business understands and supports the relationship behind it.",
      },
    ],
    contactEyebrow: "How to reach us",
    contactTitle: "Let’s talk about the loyalty experience you want to build.",
    contactBody:
      "Use any currently available channel below, or visit the contact page to choose the path that fits your request.",
    contactLabels: {
      email: "Email",
      whatsapp: "WhatsApp",
      phone: "Phone",
    },
    finalEyebrow: "Start today",
    finalTitle:
      "Turn every eligible interaction into part of a stronger relationship.",
    finalBody:
      "Create a clear, branded loyalty experience that helps customers understand their progress and gives them another reason to choose your business.",
    finalCta: "Start your free trial",
    trialNote: "14 days free · No payment required",
  },
  ar: {
    metaTitle: "عن Tanee | تجربة ولاء أوضح",
    metaDescription:
      "تعرّف على سبب بناء Tanee لتجمع نشاط العملاء وتقدّمهم ومكافآتهم في تجربة ولاء واحدة وواضحة للأنشطة النامية.",
    eyebrow: "عن Tanee",
    title: "نبني طريقة أوضح تساعد الأنشطة على بناء علاقات تدوم مع عملائها.",
    body: "تجمع Tanee نشاط العملاء المؤهل وتقدّمهم ومكافآتهم في تجربة ولاء واحدة مترابطة، لتساعد النشاط على إدارة كل علاقة بوضوح بدلًا من الأدوات المنفصلة.",
    primaryCta: "اكتشف كيف تعمل Tanee",
    secondaryCta: "تواصل مع فريقنا",
    whoEyebrow: "من نحن",
    whoTitle:
      "تجمع Tanee بين ولاء العملاء وعمليات النشاط اليومية في تجربة واحدة مترابطة.",
    whoParagraphs: [
      "نبني Tanee لتجعل تشغيل برامج الولاء أوضح للأنشطة النامية وأسهل للعملاء الذين تخدمهم.",
      "يبقى النشاط المؤهل والتقدّم والمكافآت وسياق العميل في مسار واحد بدلًا من تشتتها بين البطاقات والجداول والمتابعة اليدوية.",
      "يتحكم كل نشاط في برنامجه وتجربته التي تحمل هويته، مع تنظيم الصلاحيات والسجلات حول الأشخاص المسؤولين عن تشغيله.",
    ],
    availability: "مصممة للأنشطة النامية",
    whyEyebrow: "لماذا بنينا Tanee",
    whyTitle: "يجب أن يبدو الولاء كعلاقة، لا كنظام إضافي يحتاج إلى إدارة.",
    whyBody:
      "عندما تكون بيانات العميل ونشاطه المؤهل وتقدّمه ومكافآته في أماكن مختلفة، يفقد الفريق والعميل الصورة الكاملة. Tanee تحافظ على ترابط هذه الرحلة.",
    principles: [
      {
        id: "problem",
        label: "المشكلة",
        title: "المعاملات المنفصلة تخفي العلاقة التي تقف خلفها.",
        body: "بدون سياق مترابط، قد تبدو كل زيارة كبداية جديدة ويصبح تقدير استمرار العميل أصعب.",
      },
      {
        id: "approach",
        label: "طريقتنا",
        title: "نحافظ على ترابط كل تفاعل مؤهل في رحلة الولاء.",
        body: "تجمع Tanee سياق العميل ونشاطه وتقدّمه ومكافآته في تجربة تشغيل واحدة وواضحة.",
      },
      {
        id: "outcome",
        label: "النتيجة",
        title: "امنح العملاء سببًا أوضح للعودة.",
        body: "يرى العميل تقدّمًا له معنى، بينما يفهم النشاط العلاقة التي تقف خلفه ويدعمها.",
      },
    ],
    contactEyebrow: "طرق التواصل",
    contactTitle: "دعنا نتحدث عن تجربة الولاء التي تريد بناءها.",
    contactBody:
      "استخدم أي قناة متاحة حاليًا بالأسفل، أو انتقل إلى صفحة التواصل لاختيار المسار الأنسب لطلبك.",
    contactLabels: {
      email: "البريد الإلكتروني",
      whatsapp: "واتساب",
      phone: "الهاتف",
    },
    finalEyebrow: "ابدأ اليوم",
    finalTitle: "اجعل كل تفاعل مؤهل جزءًا من علاقة أقوى مع العميل.",
    finalBody:
      "أنشئ تجربة ولاء واضحة تحمل هوية نشاطك، وتساعد العملاء على فهم تقدّمهم وتمنحهم سببًا إضافيًا لاختيارك.",
    finalCta: "ابدأ تجربتك المجانية",
    trialNote: "14 يومًا مجانًا · بدون وسيلة دفع",
  },
};

export function getMarketingAboutCopy(locale: SupportedLocale) {
  return copy[locale];
}
