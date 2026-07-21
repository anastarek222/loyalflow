import { auth } from "@/auth";
import { getWinBackAudienceWhere, type WinBackAudience, winBackAudiences } from "@/lib/campaigns/winback";
import { canExportBusinessData } from "@/lib/permissions";
import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escapeCsvCell(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${(/^[=+\-@]/.test(text) ? `'${text}` : text).replaceAll('"', '""')}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { id: true, slug: true, rewardThreshold: true, earnAmount: true, allowOwnerDataExport: true },
  });
  if (!business) return Response.json({ error: "Business not found" }, { status: 404 });
  if (!canExportBusinessData(session.user, business.id, business.allowOwnerDataExport)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const requested = new URL(request.url).searchParams.get("audience");
  const audience = winBackAudiences.includes(requested as WinBackAudience)
    ? (requested as WinBackAudience)
    : "INACTIVE";
  const where: Prisma.CustomerWhereInput = {
    businessId: business.id,
    ...getWinBackAudienceWhere(audience, { rewardThreshold: business.rewardThreshold, earnAmount: business.earnAmount }),
  };
  const customers = await prisma.customer.findMany({
    where,
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    select: { firstName: true, lastName: true, phone: true, customerCode: true, balance: true },
  });
  const rows = [
    ["الاسم الأول", "اسم العائلة", "الهاتف", "كود العميل", "الرصيد", "الجمهور"],
    ...customers.map((customer) => [customer.firstName, customer.lastName, customer.phone, customer.customerCode, customer.balance, audience]),
  ].map((row) => row.map(escapeCsvCell).join(","));
  return new Response(`\uFEFF${rows.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${business.slug}-win-back-${audience.toLowerCase()}.csv"`,
    },
  });
}
