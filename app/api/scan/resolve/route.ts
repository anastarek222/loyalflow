import { auth } from "@/auth";
import { extractPublicCardToken } from "@/lib/cards/public-token";
import { canPerform } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import { getClientAddress, rateLimit } from "@/lib/utils/rate-limiter";
import { opaqueIdSchema } from "@/lib/validation/action-input";
import { z } from "zod";

const scanSchema = z.object({
  value: z.string().trim().min(1).max(2048),
  businessId: opaqueIdSchema,
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return Response.json(
      {
        error: "يجب تسجيل الدخول أولًا.",
      },
      {
        status: 401,
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = scanSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "بيانات رمز QR غير صحيحة.",
      },
      {
        status: 400,
      }
    );
  }

  if (!canPerform(session.user, parsed.data.businessId, "LOYALTY_EARN")) {
    return Response.json(
      { error: "ليس لديك صلاحية لفتح هذا العميل." },
      { status: 403 }
    );
  }

  const limit = rateLimit(
    `scan-resolve:${session.user.id}:${getClientAddress(request.headers)}`,
    { limit: 60, windowMs: 60_000 }
  );

  if (!limit.allowed) {
    return Response.json(
      { error: "تم تجاوز عدد المحاولات المسموح." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const publicToken = extractPublicCardToken(
    parsed.data.value
  );

  if (!publicToken) {
    return Response.json(
      {
        error: "هذا رمز QR ليس كارت LoyalFlow صالحًا.",
      },
      {
        status: 400,
      }
    );
  }

  const customer = await prisma.customer.findUnique({
    where: {
      publicToken,
    },
    select: {
      id: true,
      businessId: true,
      isActive: true,
      business: {
        select: {
          id: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });

  if (
    !customer ||
    !customer.isActive ||
    !customer.business.isActive ||
    customer.businessId !== parsed.data.businessId
  ) {
    return Response.json(
      {
        error: "العميل أو الكارت غير موجود.",
      },
      {
        status: 404,
      }
    );
  }

  return Response.json({
    ok: true,
    url: `/businesses/${customer.business.slug}/scan/customer/${customer.id}`,
  });
}
