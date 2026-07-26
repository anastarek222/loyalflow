import prisma from "@/lib/prisma";
import { derivePaymentState } from "@/lib/billing/subscription";
import {
  deriveOperationalSeverity,
  type OperationalSnapshotInput,
} from "@/lib/operations/platform-status";
import { getPublicReleaseMetadata } from "@/lib/server/release";
import { logServerError } from "@/lib/server/logging";

async function main() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalBusinesses,
    activeBusinesses,
    billingBusinesses,
    loyaltyActions24h,
  ] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { isActive: true } }),
    prisma.business.findMany({
      select: {
        isActive: true,
        paymentStatus: true,
        nextPaymentDate: true,
        gracePeriodDays: true,
      },
    }),
    prisma.loyaltyTransaction.count({
      where: { createdAt: { gte: since } },
    }),
  ]);

  const paymentStates = billingBusinesses.map((business) =>
    derivePaymentState({
      paymentStatus: business.paymentStatus,
      nextPaymentDate: business.nextPaymentDate,
      gracePeriodDays: business.gracePeriodDays,
    }),
  );

  const snapshot: OperationalSnapshotInput = {
    totalBusinesses,
    activeBusinesses,
    suspendedBusinesses: billingBusinesses.filter(
      (business) =>
        !business.isActive || business.paymentStatus === "SUSPENDED",
    ).length,
    overdueSubscriptions: paymentStates.filter(
      (state) => state === "OVERDUE",
    ).length,
    dueSoonSubscriptions: paymentStates.filter(
      (state) => state === "DUE" || state === "DUE_SOON",
    ).length,
    loyaltyActions24h,
  };

  const release = getPublicReleaseMetadata();
  const severity = deriveOperationalSeverity(snapshot);

  console.log("LoyalFlow operational readiness");
  console.log("===============================");
  console.log(`environment: ${release.environment}`);
  console.log(`release: ${release.release ?? "unknown"}`);
  console.log(`status: ${severity}`);
  console.log(`businesses: ${snapshot.activeBusinesses}/${snapshot.totalBusinesses} active`);
  console.log(`suspended: ${snapshot.suspendedBusinesses}`);
  console.log(`overdue subscriptions: ${snapshot.overdueSubscriptions}`);
  console.log(`due soon: ${snapshot.dueSoonSubscriptions}`);
  console.log(`loyalty actions (24h): ${snapshot.loyaltyActions24h}`);

  if (severity === "critical") {
    process.exitCode = 1;
    return;
  }

  console.log("\nOperational readiness snapshot completed.");
}

main()
  .catch((error) => {
    logServerError("operational_readiness_verification_failed", error);
    console.error("Operational readiness verification failed.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
