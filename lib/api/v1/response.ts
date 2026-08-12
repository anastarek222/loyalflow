import { randomUUID } from "node:crypto";

import type {
  ApiProblem,
  ApiProblemCode,
  ApiSuccess,
} from "@loyalflow/contracts/api/v1";
import { loyalFlowApiVersion } from "@loyalflow/contracts/api/v1";
import { NextResponse } from "next/server";

const SAFE_REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function resolveRequestId(headers: Headers) {
  const supplied = headers.get("x-request-id")?.trim();
  return supplied && SAFE_REQUEST_ID.test(supplied) ? supplied : randomUUID();
}

function responseHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "X-Request-ID": requestId,
  };
}

export function apiSuccess<T>(data: T, requestId: string, status = 200) {
  const body: ApiSuccess<T> = {
    ok: true,
    data,
    meta: { apiVersion: loyalFlowApiVersion, requestId },
  };

  return NextResponse.json(body, {
    status,
    headers: responseHeaders(requestId),
  });
}

export function apiProblem(input: {
  requestId: string;
  status: 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500;
  code: ApiProblemCode;
  message: string;
}) {
  const body: ApiProblem = {
    ok: false,
    error: { code: input.code, message: input.message },
    meta: { apiVersion: loyalFlowApiVersion, requestId: input.requestId },
  };

  return NextResponse.json(body, {
    status: input.status,
    headers: responseHeaders(input.requestId),
  });
}

export function internalApiProblem(requestId: string) {
  return apiProblem({
    requestId,
    status: 500,
    code: "INTERNAL_ERROR",
    message: "The request could not be completed.",
  });
}
