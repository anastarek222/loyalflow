export const loyalFlowApiVersion = "v1" as const;

export type ApiVersion = typeof loyalFlowApiVersion;

export type ApiResponseMeta = Readonly<{
  apiVersion: ApiVersion;
  requestId: string;
}>;

export type ApiSuccess<T> = Readonly<{
  ok: true;
  data: T;
  meta: ApiResponseMeta;
}>;

export type ApiProblemCode =
  | "AUTHENTICATION_REQUIRED"
  | "CAPABILITY_REQUIRED"
  | "RESOURCE_NOT_FOUND"
  | "INVALID_REQUEST"
  | "METHOD_NOT_ALLOWED"
  | "INTERNAL_ERROR";

export type ApiProblem = Readonly<{
  ok: false;
  error: Readonly<{
    code: ApiProblemCode;
    message: string;
  }>;
  meta: ApiResponseMeta;
}>;

export type ApiEnvelope<T> = ApiSuccess<T> | ApiProblem;

export type ApiVersionRead = Readonly<{
  service: "loyalflow";
  version: ApiVersion;
  stability: "INTERNAL_FOUNDATION";
  environment: string;
  release: string | null;
}>;

export type ApiLivenessRead = Readonly<{
  service: "loyalflow";
  status: "live";
  environment: string;
  release: string | null;
}>;

export type ApiBusinessSummaryRead = Readonly<{
  business: Readonly<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }>;
  program: Readonly<{
    loyaltyMode: "VISITS" | "POINTS" | "SALES_AMOUNT";
    unitName: string;
    rewardName: string;
    rewardThreshold: number;
  }>;
  counts: Readonly<{
    customers: number;
    branches: number;
  }>;
}>;

export const apiBusinessCapabilities = [
  "CUSTOMERS_VIEW",
  "CUSTOMERS_EDIT",
  "LOYALTY_EARN",
  "LOYALTY_REDEEM",
  "LOYALTY_ADJUST",
  "REPORTS_VIEW",
  "STAFF_MANAGE",
  "SETTINGS_EDIT",
] as const;

export type ApiBusinessCapability = (typeof apiBusinessCapabilities)[number];

export const apiProductEntitlements = [
  "LOYALTY_CORE",
  "REWARDS",
  "PROMOTIONS",
  "OFFERS",
  "CAMPAIGNS",
  "REFERRALS",
  "REPORTING",
  "MULTI_BRANCH",
  "CUSTOMER_NOTES_TAGS",
  "CUSTOMER_BULK_OPERATIONS",
  "GOOGLE_WALLET_READINESS",
] as const;

export type ApiProductEntitlement = (typeof apiProductEntitlements)[number];

export type ApiBusinessAccessRead = Readonly<{
  capabilities: readonly ApiBusinessCapability[];
  entitlements: readonly ApiProductEntitlement[];
}>;
