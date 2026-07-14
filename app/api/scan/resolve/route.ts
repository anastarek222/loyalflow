import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const scanSchema = z.object({
  value: z.string().trim().min(1).max(2048),
  businessId: z.string().trim().min(1).max(100),
});

function extractPublicToken(value: string) {
  const trimmedValue = value.trim();

  try {
    const url = new URL(trimmedValue);
    const parts = url.pathname.split("/").filter(Boolean);
    const cardIndex = parts.indexOf("card");

    if (cardIndex >= 0 && parts[cardIndex + 1]) {
      return decodeURIComponent(parts[cardIndex + 1]);
    }
  } catch {
    // The scanned value may be the token itself.
  }

  if (/^[a-zA-Z0-9_-]{10,128}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return null;
}

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

  const publicToken = extractPublicToken(parsed.data.value);

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
    !customer.business.isActive
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

  if (customer.businessId !== parsed.data.businessId) {
    return Response.json(
      {
        error: "هذا الكارت تابع لبراند مختلف.",
      },
      {
        status: 403,
      }
    );
  }

  const canAccess =
    session.user.role === "SUPER_ADMIN" ||
    session.user.businessId === customer.businessId;

  if (!canAccess) {
    return Response.json(
      {
        error: "ليس لديك صلاحية لفتح هذا العميل.",
      },
      {
        status: 403,
      }
    );
  }

  return Response.json({
    ok: true,
    url: `/businesses/${customer.business.slug}/customers/${customer.id}`,
  });
}
