import type { Prisma, PrismaClient } from "@/generated/prisma/client";

export type OpenReversalExceptionReportScope = {
  businessId: string;
  from?: Date;
  to?: Date;
  branchId?: string;
  attributedStaffId?: string;
  customerWhere?: Prisma.CustomerWhereInput;
};

export function buildOpenReversalExceptionWhere(
  input: OpenReversalExceptionReportScope,
): Prisma.ReversalExceptionWhereInput {
  return {
    businessId: input.businessId,
    status: "OPEN",
    blockReason: "INSUFFICIENT_BALANCE",
    ...(input.from || input.to
      ? {
          createdAt: {
            ...(input.from ? { gte: input.from } : {}),
            ...(input.to ? { lte: input.to } : {}),
          },
        }
      : {}),
    ...(input.branchId ? { branchId: input.branchId } : {}),
    ...(input.attributedStaffId
      ? { attributedStaffId: input.attributedStaffId }
      : {}),
    ...(input.customerWhere ? { customer: input.customerWhere } : {}),
  };
}

export async function countOpenReversalExceptions(
  client: Pick<PrismaClient, "reversalException">,
  input: OpenReversalExceptionReportScope,
) {
  return client.reversalException.count({
    where: buildOpenReversalExceptionWhere(input),
  });
}
