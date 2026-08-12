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
