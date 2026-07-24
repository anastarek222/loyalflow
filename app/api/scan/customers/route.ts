import { auth } from "@/auth";
import { getCustomerDisplayName } from "@/lib/customers/registration";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import {
  getScanCustomerSearchTerms,
  maskCustomerPhone,
  SCAN_CUSTOMER_SEARCH_LIMIT,
  scanCustomerSearchError,
  scanCustomerSearchSchema,
} from "@/lib/scan/customer-search";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function response(body: object, init?: ResponseInit) {
  return Response.json(body, {
    ...init,
    headers: { ...noStoreHeaders, ...init?.headers },
  });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return response(scanCustomerSearchError("UNAUTHENTICATED"), { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = scanCustomerSearchSchema.safeParse({
    businessId: url.searchParams.get("businessId"),
    query: url.searchParams.get("query"),
  });
  if (!parsed.success) {
    return response(scanCustomerSearchError("INVALID_INPUT"), { status: 400 });
  }

  if (!canPerform(session.user, parsed.data.businessId, "LOYALTY_EARN")) {
    return response(scanCustomerSearchError("FORBIDDEN"), { status: 403 });
  }

  const limit = rateLimit(
    `scan-customer-search:${session.user.id}:${getClientAddress(request.headers)}`,
    { limit: 30, windowMs: 60_000 }
  );
  if (!limit.allowed) {
    return response(scanCustomerSearchError("RATE_LIMITED"), {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const business = await prisma.business.findFirst({
    where: { id: parsed.data.businessId, isActive: true },
    select: { id: true, slug: true },
  });
  if (!business) {
    return response(scanCustomerSearchError("BUSINESS_UNAVAILABLE"), { status: 404 });
  }

  const terms = getScanCustomerSearchTerms(parsed.data.query);
  const customers = await prisma.customer.findMany({
    where: {
      businessId: business.id,
      isActive: true,
      OR: [
        { firstName: { contains: terms.text, mode: "insensitive" } },
        { lastName: { contains: terms.text, mode: "insensitive" } },
        { phone: { contains: terms.phone || terms.text } },
        { customerCode: { contains: terms.customerCode, mode: "insensitive" } },
      ],
    },
    orderBy: [{ firstName: "asc" }, { id: "asc" }],
    take: SCAN_CUSTOMER_SEARCH_LIMIT,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      customerCode: true,
    },
  });

  return response({
    ok: true,
    results: customers.map((customer) => ({
      id: customer.id,
      name: getCustomerDisplayName(customer),
      phone: maskCustomerPhone(customer.phone),
      customerCode: customer.customerCode,
      url: `/businesses/${business.slug}/scan/customer/${customer.id}`,
    })),
  });
}
