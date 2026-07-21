import type { LoyaltyMode, RewardType } from "@/generated/prisma/client";

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
  summary: string;
  settings: PlaybookSettings;
  promotionSuggestion?: string;
  offerSuggestion?: string;
  vipSuggestion?: string;
  recoverySuggestion?: string;
  campaignSuggestion?: string;
};

// These are templates, never separate runtime programmes. Applying one only
// writes normal Business settings; suggested related records remain optional.
export const businessPlaybooks: Record<BusinessPlaybookId, BusinessPlaybook> = {
  BARBER: {
    id: "BARBER",
    name: "Barber / حلاق",
    summary: "5 زيارات مقابل حلاقة مجانية مع اقتراح عملاء VIP واستعادة العملاء المتوقفين.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "حلاقة مجانية",
      rewardType: "GIFT", rewardDescription: "حلاقة مجانية بعد إكمال الزيارات.",
      rewardThreshold: 5, earnAmount: 1, loyaltyProgramName: "برنامج زيارات الحلاق",
      pointsName: "زيارة", membershipName: "عضوية العميل",
    },
    vipSuggestion: "راجع شرائح VIP تلقائيًا بعد 5 دورات مكافآت.",
    recoverySuggestion: "استخدم جمهور العملاء غير النشطين لحملة حجز جديدة يراجعها الموظف.",
    campaignSuggestion: "قالب تذكير بالحجز القادم أو المكافأة الجاهزة.",
  },
  COFFEE_SHOP: {
    id: "COFFEE_SHOP",
    name: "Coffee Shop / مقهى",
    summary: "10 زيارات مقابل قهوة مجانية، مع اقتراح Double Points Tuesday قابل للمراجعة.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "قهوة مجانية",
      rewardType: "GIFT", rewardDescription: "قهوة مجانية بعد إكمال الزيارات.",
      rewardThreshold: 10, earnAmount: 1, loyaltyProgramName: "برنامج قهوة الولاء",
      pointsName: "زيارة", membershipName: "عضوية القهوة",
    },
    promotionSuggestion: "اقترح Promotion باسم Double Points Tuesday؛ راجع التاريخ والقاعدة يدويًا لأن التكرار الأسبوعي غير مفعّل تلقائيًا.",
    offerSuggestion: "عرض قهوة موسمية محدود المدة لكل العملاء النشطين.",
  },
  SALON: {
    id: "SALON",
    name: "Salon / صالون",
    summary: "زيارات متكررة تقود إلى مكافأة خدمة قابلة للتخصيص لكل صالون.",
    settings: {
      loyaltyMode: "VISITS", unitName: "موعد", rewardName: "خدمة مجانية",
      rewardType: "GIFT", rewardDescription: "خدمة مجانية بعد تكرار المواعيد.",
      rewardThreshold: 6, earnAmount: 1, loyaltyProgramName: "برنامج مواعيد الصالون",
      pointsName: "موعد", membershipName: "عضوية الصالون",
    },
    offerSuggestion: "عرض عناية موسمي لفئة العملاء النشطين، يراجعه المالك قبل نشره.",
    recoverySuggestion: "استعادة العملاء المعرضين للتوقف برسالة حجز يدوية.",
  },
  RETAIL: {
    id: "RETAIL",
    name: "Retail / متجر",
    summary: "نقاط أو قيمة مبيعات قابلة للتعديل، مع اقتراحات مكافأة إنفاق وVIP.",
    settings: {
      loyaltyMode: "SALES_AMOUNT", unitName: "جنيه", rewardName: "قسيمة خصم",
      rewardType: "DISCOUNT", rewardDescription: "قسيمة خصم بعد بلوغ قيمة الإنفاق المطلوبة.",
      rewardThreshold: 1000, earnAmount: 100, loyaltyProgramName: "برنامج مشتريات المتجر",
      pointsName: "جنيه مؤهل", membershipName: "عضوية المتجر",
    },
    vipSuggestion: "راجع شريحة الإنفاق المرتفع ودرجات VIP المحسوبة قبل منح أي ميزة.",
    offerSuggestion: "عرض حصري للعملاء VIP أو شريحة الإنفاق المرتفع.",
  },
  GYM: {
    id: "GYM",
    name: "Gym / جيم",
    summary: "زيارات التمرين تقود إلى مكافأة عضوية أو جلسة، مع بقاء تفاصيل العضوية قابلة للتعديل.",
    settings: {
      loyaltyMode: "VISITS", unitName: "حصة", rewardName: "جلسة مجانية",
      rewardType: "GIFT", rewardDescription: "جلسة أو يوم عضوية مجاني بعد الالتزام بالحضور.",
      rewardThreshold: 12, earnAmount: 1, loyaltyProgramName: "برنامج التمرين",
      pointsName: "حصة", membershipName: "عضوية النادي",
    },
    campaignSuggestion: "تذكير يدوي بالعودة للعملاء المتوقفين عن الحضور.",
    vipSuggestion: "استخدم درجات VIP كتوجيه لبرامج الالتزام، لا كميزة تلقائية.",
  },
  RESTAURANT: {
    id: "RESTAURANT",
    name: "Restaurant / مطعم",
    summary: "برنامج زيارات قابل للتحويل إلى نقاط أو إنفاق، مع مكافأة لزيارة متكررة.",
    settings: {
      loyaltyMode: "VISITS", unitName: "زيارة", rewardName: "طبق مجاني",
      rewardType: "GIFT", rewardDescription: "طبق مجاني بعد تكرار الزيارات.",
      rewardThreshold: 8, earnAmount: 1, loyaltyProgramName: "برنامج ضيوف المطعم",
      pointsName: "زيارة", membershipName: "عضوية الضيف",
    },
    offerSuggestion: "عرض نهاية أسبوع محدود المدة لعملاء مختارين.",
    campaignSuggestion: "رسالة شكر ومراجعة يدوية بعد زيارة العميل.",
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
  return {
    ...playbook.settings,
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
