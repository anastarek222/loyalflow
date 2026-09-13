import type { SupportedLocale } from "@/lib/i18n/config";

export const MARKETING_PRICING_TRIAL_DAYS = 14;

export type MarketingPricingPlanId = "starter" | "growth" | "scale";

export type MarketingPricingPlan = {
  id: MarketingPricingPlanId;
  name: string;
  price: string;
  currency: string;
  cadence: string;
  body: string;
  featured: boolean;
  popularLabel?: string;
};

type MarketingPricingCopy = {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  body: string;
  proofTrial: string;
  proofPayment: string;
  proofSetup: string;
  planLabel: string;
  plans: readonly MarketingPricingPlan[];
  cta: string;
  planFootnote: string;
  includedEyebrow: string;
  includedTitle: string;
  included: readonly {
    id: "brand" | "activity" | "rewards" | "context";
    title: string;
    body: string;
  }[];
  faqTitle: string;
  faqs: readonly { question: string; answer: string }[];
  finalEyebrow: string;
  finalTitle: string;
  finalBody: string;
  trialNote: string;
};

const pricingCopy: Record<SupportedLocale, MarketingPricingCopy> = {
  en: {
    metaTitle: "Tanee Pricing | Simple plans. Clear pricing.",
    metaDescription:
      "Compare Tanee Starter, Growth, and Scale plans from EGP 899/month and begin with a 14-day free trial.",
    eyebrow: "Pricing",
    title: "Simple plans. Clear pricing.",
    body:
      "Choose the plan that fits your business and start building stronger customer relationships with Tanee.",
    proofTrial: "14 days free",
    proofPayment: "No payment required",
    // Stitch says “Set up in under 7 minutes”. Keep the visual slot, but use a product-safe claim.
    proofSetup: "Clear, supported setup",
    planLabel: "Plan",
    plans: [
      {
        id: "starter",
        name: "Starter",
        price: "899",
        currency: "EGP",
        cadence: "/ month",
        body: "For businesses starting their first structured loyalty experience.",
        featured: false,
      },
      {
        id: "growth",
        name: "Growth",
        price: "1,599",
        currency: "EGP",
        cadence: "/ month",
        body: "For growing businesses making loyalty part of their everyday customer experience.",
        featured: true,
        popularLabel: "MOST POPULAR",
      },
      {
        id: "scale",
        name: "Scale",
        price: "2,799",
        currency: "EGP",
        cadence: "/ month",
        body: "For established businesses managing more customers and loyalty activity.",
        featured: false,
      },
    ],
    cta: "Start your free trial",
    planFootnote:
      "Final customer, team and programme allowances will be confirmed before launch.",
    includedEyebrow: "Every plan includes",
    includedTitle: "Everything you need to run a connected loyalty experience.",
    included: [
      {
        id: "brand",
        title: "Branded loyalty experience",
        body: "A loyalty programme and digital card connected to your business identity.",
      },
      {
        id: "activity",
        title: "Customer activity and progress",
        body: "Keep eligible activity organised and make progress easy to understand.",
      },
      {
        id: "rewards",
        title: "Rewards under your control",
        body: "Choose the rewards and conditions that suit your programme.",
      },
      {
        id: "context",
        title: "Clear relationship context",
        body: "Connect customer information, activity, progress and rewards in one place.",
      },
    ],
    faqTitle: "Pricing questions",
    faqs: [
      {
        question: "Can I try Tanee before subscribing?",
        answer: "Yes. Every plan starts with a 14-day free trial.",
      },
      {
        question: "Do I need a payment method to start?",
        answer: "No. You can begin the trial without adding a payment method.",
      },
      {
        question: "Can I change my plan later?",
        answer: "Yes. You can move to a plan that better fits your business as it grows.",
      },
      {
        question: "What is different between the plans?",
        answer:
          "Each plan is designed for a different level of customer and loyalty activity. Final allowances will be confirmed before launch.",
      },
    ],
    finalEyebrow: "Start today",
    finalTitle: "Find the right plan for your business.",
    finalBody:
      "Start your free trial and see how Tanee fits your customer experience.",
    trialNote: "14 days free · No payment required",
  },
  ar: {
    metaTitle: "أسعار Tanee | باقات واضحة لنمو نشاطك",
    metaDescription:
      "قارن باقات Tanee الأساسية والاحترافية والمتقدمة بداية من 899 جنيهًا مصريًا شهريًا، وابدأ تجربة مجانية لمدة 14 يومًا.",
    eyebrow: "الأسعار",
    title: "باقات واضحة تناسب مرحلة نمو نشاطك.",
    body:
      "اختر الباقة المناسبة لاحتياجات نشاطك، وابدأ في بناء علاقات أقوى مع عملائك باستخدام Tanee.",
    proofTrial: "14 يومًا مجانًا",
    proofPayment: "بدون دفع",
    // Stitch says “إعداد في أقل من 7 دقائق”. Keep the slot while avoiding an unverified timing promise.
    proofSetup: "إعداد واضح ومدعوم",
    planLabel: "الخطة",
    plans: [
      {
        id: "starter",
        name: "الأساسية",
        price: "899",
        currency: "جنيهًا مصريًا",
        cadence: "/ شهريًا",
        body: "للأنشطة الصغيرة التي تريد إطلاق برنامج ولاء واضح وسهل الإدارة.",
        featured: false,
      },
      {
        id: "growth",
        name: "الاحترافية",
        price: "1,599",
        currency: "جنيهًا مصريًا",
        cadence: "/ شهريًا",
        body: "للأنشطة النامية التي تدير تفاعل العملاء وبرنامج الولاء بصورة يومية.",
        featured: true,
        popularLabel: "الأكثر اختيارًا",
      },
      {
        id: "scale",
        name: "المتقدمة",
        price: "2,799",
        currency: "جنيهًا مصريًا",
        cadence: "/ شهريًا",
        body: "للأنشطة التي تحتاج إلى إدارة عدد أكبر من العملاء وبرامج الولاء.",
        featured: false,
      },
    ],
    cta: "ابدأ تجربتك المجانية",
    planFootnote:
      "سيتم تأكيد الحدود النهائية للعملاء وأعضاء الفريق وإمكانات البرنامج قبل الإطلاق.",
    includedEyebrow: "تشمل كل الخطط",
    includedTitle: "كل ما تحتاجه لإدارة تجربة ولاء مترابطة.",
    included: [
      {
        id: "brand",
        title: "تجربة ولاء تحمل هويتك",
        body: "برنامج ولاء وبطاقة رقمية يعكسان هوية نشاطك.",
      },
      {
        id: "activity",
        title: "نشاط العملاء وتقدّمهم",
        body: "نظّم العمليات المؤهلة واجعل تقدّم العملاء سهل المتابعة والفهم.",
      },
      {
        id: "rewards",
        title: "تحكّم كامل في المكافآت",
        body: "اختر المكافآت وشروط استحقاقها بما يناسب برنامجك.",
      },
      {
        id: "context",
        title: "صورة أوضح لكل علاقة",
        body: "اجمع بيانات العميل ونشاطه وتقدّمه ومكافآته في مكان واحد.",
      },
    ],
    faqTitle: "أسئلة شائعة عن الأسعار",
    faqs: [
      {
        question: "هل يمكنني تجربة Tanee قبل الاشتراك؟",
        answer: "نعم. تبدأ كل خطة بتجربة مجانية لمدة 14 يومًا.",
      },
      {
        question: "هل أحتاج إلى إضافة وسيلة دفع للبدء؟",
        answer: "لا. يمكنك بدء التجربة المجانية من دون إضافة وسيلة دفع.",
      },
      {
        question: "هل يمكنني تغيير خطتي لاحقًا؟",
        answer: "نعم. يمكنك الانتقال إلى الخطة الأنسب لنشاطك مع نموه.",
      },
      {
        question: "ما الفرق بين الخطط؟",
        answer:
          "كل خطة مناسبة لمستوى مختلف من أعداد العملاء ونشاط برنامج الولاء. وسيتم تأكيد الحدود النهائية قبل الإطلاق.",
      },
    ],
    finalEyebrow: "ابدأ اليوم",
    finalTitle: "اختر الباقة المناسبة لنشاطك.",
    finalBody:
      "ابدأ تجربتك المجانية واكتشف كيف تساعدك Tanee على تقديم تجربة ولاء أفضل لعملائك.",
    trialNote: "14 يومًا مجانًا · بدون دفع",
  },
};

export function getMarketingPricingCopy(locale: SupportedLocale) {
  return pricingCopy[locale];
}
