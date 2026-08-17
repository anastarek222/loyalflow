import type { LoyaltyMode, RewardType } from "@/generated/prisma/client";
import { loyaltyProgramSchema } from "@/lib/business/domain-validation";

export const businessPlaybookIds = [
  "BARBER",
  "COFFEE_SHOP",
  "SALON",
  "RETAIL",
  "GYM",
  "RESTAURANT",
] as const;

export type BusinessPlaybookId = (typeof businessPlaybookIds)[number];

type PlaybookSettings = {
  loyaltyMode: LoyaltyMode;
  unitName: string;
  rewardName: string;
  rewardType: RewardType;
  rewardDescription: string;
  rewardThreshold: number;
  earnAmount: number;
  loyaltyProgramName: string;
  pointsName: string;
  membershipName: string;
};

export type BusinessPlaybook = {
  id: BusinessPlaybookId;
  name: string;
  nameEn: string;
  summary: string;
  summaryEn: string;
  settings: PlaybookSettings;
  promotionSuggestion?: string;
  promotionSuggestionEn?: string;
  offerSuggestion?: string;
  offerSuggestionEn?: string;
  vipSuggestion?: string;
  vipSuggestionEn?: string;
  recoverySuggestion?: string;
  recoverySuggestionEn?: string;
  campaignSuggestion?: string;
  campaignSuggestionEn?: string;
};

// These are templates, never separate runtime programmes. Applying one only
// writes normal Business settings; suggested related records remain optional.
export const businessPlaybooks: Record<BusinessPlaybookId, BusinessPlaybook> = {
  BARBER: {
    id: "BARBER",
    name: "حلاق",
    nameEn: "Barber",
    summary: "5 زيارات مقابل حلاقة مجانية مع اقتراح عملاء VIP واستعادة العملاء المتوقفين.",
    summaryEn: "5 visits toward a free haircut, with optional VIP and customer-recovery suggestions.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "حلاقة مجانية",
      rewardType: "GIFT", rewardDescription: "حلاقة مجانية بعد إكمال الزيارات.",
      rewardThreshold: 5, earnAmount: 1, loyaltyProgramName: "برنامج زيارات الحلاق",
      pointsName: "زيارة", membershipName: "عضوية العميل",
    },
    vipSuggestion: "راجع شرائح VIP تلقائيًا بعد 5 دورات مكافآت.",
    vipSuggestionEn: "Review VIP segments after 5 completed reward cycles.",
    recoverySuggestion: "استخدم جمهور العملاء غير النشطين لحملة حجز جديدة يراجعها الموظف.",
    recoverySuggestionEn: "Use the inactive-customer audience for a staff-reviewed rebooking campaign.",
    campaignSuggestion: "قالب تذكير بالحجز القادم أو المكافأة الجاهزة.",
    campaignSuggestionEn: "A reminder template for the next booking or a ready reward.",
  },
  COFFEE_SHOP: {
    id: "COFFEE_SHOP",
    name: "مقهى",
    nameEn: "Coffee Shop",
    summary: "10 زيارات مقابل قهوة مجانية، مع اقتراح Double Points Tuesday قابل للمراجعة.",
    summaryEn: "10 visits toward a free coffee, with a reviewable Double Points Tuesday suggestion.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "قهوة مجانية",
      rewardType: "GIFT", rewardDescription: "قهوة مجانية بعد إكمال الزيارات.",
      rewardThreshold: 10, earnAmount: 1, loyaltyProgramName: "برنامج قهوة الولاء",
      pointsName: "زيارة", membershipName: "عضوية القهوة",
    },
    promotionSuggestion: "اقترح Promotion باسم Double Points Tuesday؛ راجع التاريخ والقاعدة يدويًا لأن التكرار الأسبوعي غير مفعّل تلقائيًا.",
    promotionSuggestionEn: "Suggest a Double Points Tuesday promotion; review the date and rule manually because weekly recurrence is not enabled automatically.",
    offerSuggestion: "عرض قهوة موسمية محدود المدة لكل العملاء النشطين.",
    offerSuggestionEn: "A limited-time seasonal coffee offer for active customers.",
  },
  SALON: {
    id: "SALON",
    name: "صالون",
    nameEn: "Salon",
    summary: "زيارات متكررة تقود إلى مكافأة خدمة قابلة للتخصيص لكل صالون.",
    summaryEn: "Repeat visits lead to a service reward that each salon can customize.",
    settings: {
      loyaltyMode: "VISITS", unitName: "موعد", rewardName: "خدمة مجانية",
      rewardType: "GIFT", rewardDescription: "خدمة مجانية بعد تكرار المواعيد.",
      rewardThreshold: 6, earnAmount: 1, loyaltyProgramName: "برنامج مواعيد الصالون",
      pointsName: "موعد", membershipName: "عضوية الصالون",
    },
    offerSuggestion: "عرض عناية موسمي لفئة العملاء النشطين، يراجعه المالك قبل نشره.",
    offerSuggestionEn: "A seasonal care offer for active customers, reviewed by the owner before publication.",
    recoverySuggestion: "استعادة العملاء المعرضين للتوقف برسالة حجز يدوية.",
    recoverySuggestionEn: "Recover customers at risk of lapsing with a manually reviewed booking message.",
  },
  RETAIL: {
    id: "RETAIL",
    name: "متجر",
    nameEn: "Retail",
    summary: "نقاط أو قيمة مبيعات قابلة للتعديل، مع اقتراحات مكافأة إنفاق وVIP.",
    summaryEn: "Configurable points or sales-value loyalty, with spend-reward and VIP suggestions.",
    settings: {
      loyaltyMode: "SALES_AMOUNT", unitName: "جنيه", rewardName: "قسيمة خصم",
      rewardType: "DISCOUNT", rewardDescription: "قسيمة خصم بعد بلوغ قيمة الإنفاق المطلوبة.",
      rewardThreshold: 1000, earnAmount: 100, loyaltyProgramName: "برنامج مشتريات المتجر",
      pointsName: "جنيه مؤهل", membershipName: "عضوية المتجر",
    },
    vipSuggestion: "راجع شريحة الإنفاق المرتفع ودرجات VIP المحسوبة قبل منح أي ميزة.",
    vipSuggestionEn: "Review the high-spend segment and calculated VIP grades before granting any benefit.",
    offerSuggestion: "عرض حصري للعملاء VIP أو شريحة الإنفاق المرتفع.",
    offerSuggestionEn: "An exclusive offer for VIP customers or the high-spend segment.",
  },
  GYM: {
    id: "GYM",
    name: "جيم",
    nameEn: "Gym",
    summary: "زيارات التمرين تقود إلى مكافأة عضوية أو جلسة، مع بقاء تفاصيل العضوية قابلة للتعديل.",
    summaryEn: "Workout visits lead to a membership or session reward while membership details remain configurable.",
    settings: {
      loyaltyMode: "VISITS", unitName: "حصة", rewardName: "جلسة مجانية",
      rewardType: "GIFT", rewardDescription: "جلسة أو يوم عضوية مجاني بعد الالتزام بالحضور.",
      rewardThreshold: 12, earnAmount: 1, loyaltyProgramName: "برنامج التمرين",
      pointsName: "حصة", membershipName: "عضوية النادي",
    },
    campaignSuggestion: "تذكير يدوي بالعودة للعملاء المتوقفين عن الحضور.",
    campaignSuggestionEn: "A manually reviewed return reminder for customers who stopped attending.",
    vipSuggestion: "استخدم درجات VIP كتوجيه لبرامج الالتزام، لا كميزة تلقائية.",
    vipSuggestionEn: "Use VIP grades as guidance for retention programmes, not as an automatic benefit.",
  },
  RESTAURANT: {
    id: "RESTAURANT",
    name: "مطعم",
    nameEn: "Restaurant",
    summary: "برنامج زيارات قابل للتحويل إلى نقاط أو إنفاق، مع مكافأة لزيارة متكررة.",
    summaryEn: "A visit programme that can be adapted to points or spend, with a repeat-visit reward.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "طبق مجاني",
      rewardType: "GIFT", rewardDescription: "طبق مجاني بعد تكرار الزيارات.",
      rewardThreshold: 8, earnAmount: 1, loyaltyProgramName: "برنامج ضيوف المطعم",
      pointsName: "زيارة", membershipName: "عضوية الضيف",
    },
    offerSuggestion: "عرض نهاية أسبوع محدود المدة لعملاء مختارين.",
    offerSuggestionEn: "A limited-time weekend offer for selected customers.",
    campaignSuggestion: "رسالة شكر ومراجعة يدوية بعد زيارة العميل.",
    campaignSuggestionEn: "A thank-you message with manual review after a customer visit.",
  },
};

export function getBusinessPlaybook(value: string | null | undefined) {
  return value && businessPlaybookIds.includes(value as BusinessPlaybookId)
    ? businessPlaybooks[value as BusinessPlaybookId]
    : null;
}

export type PlaybookBusinessState = Omit<
  PlaybookSettings,
  "rewardDescription" | "loyaltyProgramName" | "pointsName" | "membershipName"
> & {
  rewardDescription: string | null;
  loyaltyProgramName: string | null;
  pointsName: string | null;
  membershipName: string | null;
  rewardCode: string | null;
  welcomeMessage: string | null;
  whatsappWelcomeMessage: string | null;
  whatsappBalanceMessage: string | null;
  whatsappRewardMessage: string | null;
  businessSettingsActivityCount: number;
  customerCount: number;
  transactionCount: number;
  rewardCount: number;
  promotionCount: number;
  offerCount: number;
};

const initialSettings = {
  loyaltyMode: "VISITS" as LoyaltyMode,
  unitName: "زيارة",
  rewardName: "هدية مجانية",
  rewardType: "GIFT" as RewardType,
  rewardDescription: null,
  rewardThreshold: 5,
  earnAmount: 1,
  loyaltyProgramName: null,
  pointsName: null,
  membershipName: null,
};

/** An existing configuration is never overwritten without a second explicit confirmation. */
export function isBusinessConfiguredForPlaybook(state: PlaybookBusinessState) {
  return (
    state.loyaltyMode !== initialSettings.loyaltyMode ||
    state.unitName !== initialSettings.unitName ||
    state.rewardName !== initialSettings.rewardName ||
    state.rewardType !== initialSettings.rewardType ||
    state.rewardDescription !== initialSettings.rewardDescription ||
    state.rewardThreshold !== initialSettings.rewardThreshold ||
    state.earnAmount !== initialSettings.earnAmount ||
    state.loyaltyProgramName !== initialSettings.loyaltyProgramName ||
    state.pointsName !== initialSettings.pointsName ||
    state.membershipName !== initialSettings.membershipName ||
    state.rewardCode !== null ||
    state.welcomeMessage !== null ||
    state.whatsappWelcomeMessage !== null ||
    state.whatsappBalanceMessage !== null ||
    state.whatsappRewardMessage !== null ||
    state.businessSettingsActivityCount > 0 ||
    state.customerCount > 0 || state.transactionCount > 0 || state.rewardCount > 0 ||
    state.promotionCount > 0 || state.offerCount > 0
  );
}

export function playbookMatchesBusiness(playbook: BusinessPlaybook, state: PlaybookBusinessState) {
  return Object.entries(playbook.settings).every(([key, value]) =>
    state[key as keyof PlaybookSettings] === value
  );
}

export function getPlaybookBusinessUpdate(playbook: BusinessPlaybook) {
  const defaultMilestone = loyaltyProgramSchema.parse(playbook.settings);
  return {
    ...playbook.settings,
    ...defaultMilestone,
    rewardCode: null,
    welcomeMessage: null,
  };
}

export function getPlaybookApplicationPlan(playbook: BusinessPlaybook) {
  return {
    businessUpdate: getPlaybookBusinessUpdate(playbook),
    // Suggestions are intentionally non-persistent. Owners can create normal
    // rewards, promotions, offers, or campaigns later through their own flows.
    creates: { rewards: 0, promotions: 0, offers: 0, campaigns: 0 },
  };
}
