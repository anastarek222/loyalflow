import "dotenv/config";
import process from "node:process";
import { spawn } from "node:child_process";

import bcrypt from "bcryptjs";
import { input, password } from "@inquirer/prompts";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, UserRole } from "../generated/prisma/client";
import { assertDatabaseScriptEnvironment } from "../lib/server/database-script-guard";

const REQUIRED_DATABASE = "neondb";
const SUPER_ADMIN_EMAIL = "anstarek211@gmail.com";
const RESET_CONFIRMATION = "RESET LOYALFLOW PRODUCTION";

// PlanConfiguration is deliberately absent: it is global product configuration,
// has no businessId, and the schema exposes no tenant relation to it.
const TENANT_TABLES = [
  "Business",
  "User",
  "Customer",
  "CustomerTag",
  "CustomerTagAssignment",
  "CustomerNote",
  "Reward",
  "Offer",
  "LoyaltyTransaction",
  "Branch",
  "BranchStaffAssignment",
  "Promotion",
  "PromotionApplication",
  "RewardRedemption",
  "RewardUnlock",
  "CustomerReferralCode",
  "Referral",
  "BusinessActivity",
  "Notification",
  "NotificationReadState",
  "NotificationItemRead",
] as const;

type TenantTable = (typeof TENANT_TABLES)[number];
type ForeignKey = {
  childTable: string;
  parentTable: string;
  deleteAction: string;
};

function assertSafetyConfiguration() {
  assertDatabaseScriptEnvironment("destructive-reset");
  if (process.env.LOYALFLOW_ENVIRONMENT !== "production") {
    throw new Error("LOYALFLOW_ENVIRONMENT must exactly equal production.");
  }

  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const expectedDatabase = process.env.LOYALFLOW_PRODUCTION_DATABASE?.trim();
  if (!expectedDatabase) {
    throw new Error("LOYALFLOW_PRODUCTION_DATABASE is not configured.");
  }

  if (expectedDatabase !== REQUIRED_DATABASE) {
    throw new Error("LOYALFLOW_PRODUCTION_DATABASE must exactly equal neondb.");
  }

  return { connectionString, expectedDatabase };
}

function assertProductionDatabase(actualDatabase: string, expectedDatabase: string) {
  if (actualDatabase !== REQUIRED_DATABASE) {
    throw new Error("Connected database must exactly equal neondb.");
  }

  if (/(test|dev|local|staging)/i.test(actualDatabase)) {
    throw new Error("Connected database name looks like a non-production database.");
  }

  if (actualDatabase !== expectedDatabase) {
    throw new Error("Connected database does not match LOYALFLOW_PRODUCTION_DATABASE.");
  }
}

function deletionOrderFromForeignKeys(foreignKeys: ForeignKey[]) {
  const tenantTables = new Set<string>(TENANT_TABLES);
  const outgoing = new Map<string, Set<string>>(
    TENANT_TABLES.map((table) => [table, new Set<string>()])
  );
  const incomingCount = new Map<string, number>(TENANT_TABLES.map((table) => [table, 0]));

  for (const foreignKey of foreignKeys) {
    if (
      !tenantTables.has(foreignKey.childTable) ||
      !tenantTables.has(foreignKey.parentTable) ||
      foreignKey.childTable === foreignKey.parentTable
    ) {
      continue;
    }

    const parents = outgoing.get(foreignKey.childTable)!;
    if (!parents.has(foreignKey.parentTable)) {
      parents.add(foreignKey.parentTable);
      incomingCount.set(
        foreignKey.parentTable,
        (incomingCount.get(foreignKey.parentTable) ?? 0) + 1
      );
    }
  }

  const available = TENANT_TABLES.filter(
    (table) => incomingCount.get(table) === 0
  ).sort();
  const ordered: TenantTable[] = [];

  while (available.length > 0) {
    const table = available.shift()! as TenantTable;
    ordered.push(table);

    for (const parent of [...outgoing.get(table)!].sort()) {
      const remaining = (incomingCount.get(parent) ?? 0) - 1;
      incomingCount.set(parent, remaining);
      if (remaining === 0) {
        available.push(parent as TenantTable);
        available.sort();
      }
    }
  }

  if (ordered.length !== TENANT_TABLES.length) {
    throw new Error("The live tenant foreign-key graph contains a deletion cycle.");
  }

  if (ordered.indexOf("User") > ordered.indexOf("Business")) {
    throw new Error("The live foreign-key graph would delete Business before User.");
  }

  return ordered;
}

async function deleteTable(transaction: Prisma.TransactionClient, table: TenantTable) {
  switch (table) {
    case "Business":
      return transaction.business.deleteMany();
    case "User":
      // The preserved global super admin is upserted below, after all of its
      // tenant-scoped dependents are gone and before Business is deleted.
      return transaction.user.deleteMany({ where: { email: { not: SUPER_ADMIN_EMAIL } } });
    case "Customer":
      return transaction.customer.deleteMany();
    case "CustomerTag":
      return transaction.customerTag.deleteMany();
    case "CustomerTagAssignment":
      return transaction.customerTagAssignment.deleteMany();
    case "CustomerNote":
      return transaction.customerNote.deleteMany();
    case "Reward":
      return transaction.reward.deleteMany();
    case "Offer":
      return transaction.offer.deleteMany();
    case "LoyaltyTransaction":
      return transaction.loyaltyTransaction.deleteMany();
    case "Branch":
      return transaction.branch.deleteMany();
    case "BranchStaffAssignment":
      return transaction.branchStaffAssignment.deleteMany();
    case "Promotion":
      return transaction.promotion.deleteMany();
    case "PromotionApplication":
      return transaction.promotionApplication.deleteMany();
    case "RewardRedemption":
      return transaction.rewardRedemption.deleteMany();
    case "RewardUnlock":
      return transaction.rewardUnlock.deleteMany();
    case "CustomerReferralCode":
      return transaction.customerReferralCode.deleteMany();
    case "Referral":
      return transaction.referral.deleteMany();
    case "BusinessActivity":
      return transaction.businessActivity.deleteMany();
    case "Notification":
      return transaction.notification.deleteMany();
    case "NotificationReadState":
      return transaction.notificationReadState.deleteMany();
    case "NotificationItemRead":
      return transaction.notificationItemRead.deleteMany();
  }
}

async function verifyMigrationStatus() {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
    const child = spawn(command, ["exec", "prisma", "migrate", "status"], {
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", () => reject(new Error("Unable to run Prisma migration status.")));
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error("Prisma migration status is not up to date."));
    });
  });
}

async function main() {
  const { connectionString, expectedDatabase } = assertSafetyConfiguration();
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

  try {
    const identity = await prisma.$queryRaw<Array<{ database: string }>>`
      SELECT current_database() AS database
    `;
    assertProductionDatabase(identity[0]?.database ?? "", expectedDatabase);

    const foreignKeys = await prisma.$queryRaw<ForeignKey[]>`
      SELECT
        child_table.relname AS "childTable",
        parent_table.relname AS "parentTable",
        foreign_key.confdeltype::text AS "deleteAction"
      FROM pg_constraint AS foreign_key
      JOIN pg_class AS child_table ON child_table.oid = foreign_key.conrelid
      JOIN pg_namespace AS child_schema ON child_schema.oid = child_table.relnamespace
      JOIN pg_class AS parent_table ON parent_table.oid = foreign_key.confrelid
      JOIN pg_namespace AS parent_schema ON parent_schema.oid = parent_table.relnamespace
      WHERE foreign_key.contype = 'f'
        AND child_schema.nspname = 'public'
        AND parent_schema.nspname = 'public'
    `;
    const deletionOrder = deletionOrderFromForeignKeys(foreignKeys);

    console.log("Deletion order from the live foreign-key graph:");
    console.log(deletionOrder.join(" -> "));
    console.log("Preserved: database schema, all Prisma migrations, _prisma_migrations, PlanConfiguration.");

    const confirmation = await input({ message: `Type ${RESET_CONFIRMATION} to continue:` });
    if (confirmation !== RESET_CONFIRMATION) {
      throw new Error("Confirmation did not match. No data was changed.");
    }

    const adminPassword = await password({
      message: "New password for anstarek211@gmail.com (minimum 10 characters):",
      mask: "*",
      validate: (value) => value.length >= 10 || "Password must contain at least 10 characters.",
    });
    const passwordConfirmation = await password({ message: "Confirm password:", mask: "*" });
    if (adminPassword !== passwordConfirmation) {
      throw new Error("Passwords do not match. No data was changed.");
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.$transaction(async (transaction) => {
      for (const table of deletionOrder) {
        await deleteTable(transaction, table);

        if (table === "User") {
          await transaction.user.upsert({
            where: { email: SUPER_ADMIN_EMAIL },
            create: {
              firstName: "Anas",
              email: SUPER_ADMIN_EMAIL,
              passwordHash,
              role: UserRole.SUPER_ADMIN,
              businessId: null,
              isActive: true,
            },
            update: {
              firstName: "Anas",
              passwordHash,
              role: UserRole.SUPER_ADMIN,
              businessId: null,
              isActive: true,
            },
          });
        }
      }
    }, { maxWait: 10_000, timeout: 120_000 });

    const [businesses, customers, transactions, redemptions, activities, users, admin] =
      await Promise.all([
        prisma.business.count(),
        prisma.customer.count(),
        prisma.loyaltyTransaction.count(),
        prisma.rewardRedemption.count(),
        prisma.businessActivity.count(),
        prisma.user.count(),
        prisma.user.findUnique({
          where: { email: SUPER_ADMIN_EMAIL },
          select: { email: true, role: true, businessId: true, isActive: true },
        }),
      ]);

    if (
      businesses !== 0 || customers !== 0 || transactions !== 0 ||
      redemptions !== 0 || activities !== 0 || users !== 1 ||
      admin?.email !== SUPER_ADMIN_EMAIL || admin.role !== UserRole.SUPER_ADMIN ||
      admin.businessId !== null || admin.isActive !== true
    ) {
      throw new Error("Post-reset verification failed.");
    }

    await verifyMigrationStatus();
    console.log("Production data reset completed and post-reset checks passed.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    "Production data reset failed:",
    error instanceof Error ? error.message : String(error)
  );
  process.exitCode = 1;
});
