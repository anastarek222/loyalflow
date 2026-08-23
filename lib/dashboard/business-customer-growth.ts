import prisma from "@/lib/prisma";

type CustomerGrowthRow = {
  date: string;
  customers: bigint;
};

export async function getBusinessCustomerGrowth(
  businessId: string,
  since: Date,
) {
  const rows = await prisma.$queryRaw<CustomerGrowthRow[]>`
    SELECT
      TO_CHAR("createdAt", 'MM-DD') AS date,
      COUNT(*)::bigint AS customers
    FROM "Customer"
    WHERE
      "businessId" = ${businessId}
      AND "createdAt" >= ${since}
    GROUP BY TO_CHAR("createdAt", 'MM-DD')
    ORDER BY TO_CHAR("createdAt", 'MM-DD') ASC
    LIMIT 31
  `;

  return rows.map((row) => ({
    date: row.date,
    customers: Number(row.customers),
  }));
}
