import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import type { Prisma } from "@/generated/prisma/client";
import {
  BusinessDeletionStaleError,
  canDeleteBusiness,
  deleteBusinessData,
  validateBusinessDeletionConfirmation,
} from "@/lib/business/deletion";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const settings = source("app/businesses/[slug]/settings/page.tsx");
const actions = source("app/businesses/[slug]/settings/actions.ts");
const dangerZone = source("components/business-deletion-danger-zone.tsx");

const businessId = "business-canonical";
const businessName = "North Star";

function transactionMock(options?: { locked?: boolean; lockedName?: string }) {
  const calls: Array<{
    operation: string;
    input?: unknown;
  }> = [];
  const deletionModels = [
    "notificationItemRead",
    "notificationReadState",
    "notification",
    "customerNote",
    "promotionApplication",
    "rewardUnlock",
    "rewardRedemption",
    "businessActivity",
    "branchStaffAssignment",
    "loyaltyTransaction",
    "referral",
    "customerReferralCode",
    "customerTagAssignment",
    "customerTag",
    "offer",
    "promotion",
    "reward",
    "branch",
    "customer",
  ] as const;
  const transaction: Record<string, unknown> = {
    $queryRaw: async (_query: TemplateStringsArray, id: string) => {
      calls.push({ operation: "lock", input: id });
      return options?.locked === false
        ? []
        : [{ id, name: options?.lockedName ?? businessName }];
    },
    user: {
      updateMany: async (input: unknown) => {
        calls.push({ operation: "user.updateMany", input });
        return { count: 2 };
      },
    },
    business: {
      delete: async (input: unknown) => {
        calls.push({ operation: "business.delete", input });
        return { id: businessId };
      },
    },
  };
  for (const model of deletionModels) {
    transaction[model] = {
      deleteMany: async (input: unknown) => {
        calls.push({ operation: `${model}.deleteMany`, input });
        return { count: 0 };
      },
    };
  }
  return {
    calls,
    deletionModels,
    transaction: transaction as unknown as Prisma.TransactionClient,
  };
}

test("DANGER-1 authorizes only the true owner or Super Admin", () => {
  assert.equal(
    canDeleteBusiness(
      { role: "OWNER", businessId },
      businessId,
    ),
    true,
  );
  assert.equal(
    canDeleteBusiness(
      { role: "SUPER_ADMIN", businessId: null },
      businessId,
    ),
    true,
  );
  for (const role of ["MANAGER", "STAFF", "VIEWER"] as const) {
    assert.equal(
      canDeleteBusiness({ role, businessId }, businessId),
      false,
    );
  }
  assert.equal(
    canDeleteBusiness(
      { role: "OWNER", businessId: "another-business" },
      businessId,
    ),
    false,
  );
  assert.match(
    settings,
    /canDeleteBusiness\(session\.user, business\.id\)[\s\S]*?<BusinessDeletionDangerZone/,
  );
});

test("DANGER-1 requires exact server-side business name and DELETE confirmations", () => {
  assert.deepEqual(
    validateBusinessDeletionConfirmation(
      { businessName, confirmationWord: "DELETE" },
      businessName,
    ),
    { valid: true },
  );
  assert.deepEqual(
    validateBusinessDeletionConfirmation(
      { businessName: `${businessName} `, confirmationWord: "DELETE" },
      businessName,
    ),
    { valid: false, reason: "BUSINESS_NAME_MISMATCH" },
  );
  assert.deepEqual(
    validateBusinessDeletionConfirmation(
      { businessName, confirmationWord: "delete" },
      businessName,
    ),
    { valid: false, reason: "DELETE_WORD_MISMATCH" },
  );
  assert.match(actions, /validateBusinessDeletionConfirmation/);
  assert.match(dangerZone, /disabled=\{!confirmationMatches \|\| pending\}/);
  assert.match(dangerZone, /typedBusinessName === businessName/);
  assert.match(dangerZone, /confirmationWord === "DELETE"/);
});

test("DANGER-1 deletion is ordered, transactional, and scoped to the canonical business", async () => {
  const mock = transactionMock();
  await deleteBusinessData(mock.transaction, businessId, businessName);

  assert.equal(mock.calls[0]?.operation, "lock");
  assert.equal(mock.calls[0]?.input, businessId);
  for (const model of mock.deletionModels) {
    const call = mock.calls.find(
      (candidate) => candidate.operation === `${model}.deleteMany`,
    );
    assert.deepEqual(call?.input, { where: { businessId } });
  }
  assert.deepEqual(
    mock.calls.find((call) => call.operation === "user.updateMany")?.input,
    {
      where: {
        businessId,
        role: { in: ["OWNER", "MANAGER", "STAFF", "VIEWER"] },
      },
      data: {
        businessId: null,
        isActive: false,
        authVersion: { increment: 1 },
      },
    },
  );
  assert.deepEqual(mock.calls.at(-1), {
    operation: "business.delete",
    input: { where: { id: businessId } },
  });
  assert.match(actions, /prisma\.\$transaction\(async \(transaction\)/);
  assert.match(
    actions,
    /deleteBusinessData\(transaction, business\.id, business\.name\)/,
  );
});

test("DANGER-1 preserves every user account and touches no unrelated tenant", async () => {
  const mock = transactionMock();
  await deleteBusinessData(mock.transaction, businessId, businessName);

  assert.equal(
    mock.calls.some((call) => call.operation === "user.delete"),
    false,
  );
  assert.equal(
    mock.calls.some((call) => call.operation === "user.deleteMany"),
    false,
  );
  assert.ok(
    mock.calls.every((call) => {
      if (call.operation === "lock") return call.input === businessId;
      const input = call.input as
        | { where?: { businessId?: string; id?: string } }
        | undefined;
      return (
        input?.where?.businessId === businessId ||
        input?.where?.id === businessId
      );
    }),
  );
});

test("DANGER-1 neutralizes orphaned tenant accounts and invalidates active sessions", async () => {
  const mock = transactionMock();
  await deleteBusinessData(mock.transaction, businessId, businessName);

  const update = mock.calls.find(
    (call) => call.operation === "user.updateMany",
  )?.input;
  assert.deepEqual(update, {
    where: {
      businessId,
      role: { in: ["OWNER", "MANAGER", "STAFF", "VIEWER"] },
    },
    data: {
      businessId: null,
      isActive: false,
      authVersion: { increment: 1 },
    },
  });
  assert.match(source("auth.ts"), /if \(!currentUser\.isActive\) \{\s*return null;/);
  assert.match(
    source("auth.ts"),
    /isCurrentAuthVersion\(\s*token\.authVersion,\s*currentUser\.authVersion,\s*\)[\s\S]*?return null;/,
  );
  assert.match(
    source("lib/permissions.ts"),
    /if \(user\.businessId !== businessId\) return false;/,
  );
  assert.match(
    source("components/authenticated-locale-shell.tsx"),
    /user\?\.business[\s\S]*?: \[\]/,
  );
});

test("DANGER-1 rejects a stale repeated deletion before child mutation", async () => {
  const mock = transactionMock({ locked: false });
  await assert.rejects(
    deleteBusinessData(mock.transaction, businessId, businessName),
    BusinessDeletionStaleError,
  );
  assert.deepEqual(mock.calls, [{ operation: "lock", input: businessId }]);
});

test("DANGER-1 rejects deletion if the business name changed after confirmation", async () => {
  const mock = transactionMock({ lockedName: "Renamed Business" });
  await assert.rejects(
    deleteBusinessData(mock.transaction, businessId, businessName),
    BusinessDeletionStaleError,
  );
  assert.deepEqual(mock.calls, [{ operation: "lock", input: businessId }]);
});

test("DANGER-1 action resolves the canonical business and redirects away safely", () => {
  const start = actions.indexOf("export async function deleteBusinessAction");
  const body = actions.slice(start);
  assert.match(body, /const session = await auth\(\)/);
  assert.match(body, /prisma\.business\.findUnique\(\{[\s\S]*where: \{ slug \}/);
  assert.match(body, /canDeleteBusiness\(session\.user, business\.id\)/);
  assert.match(body, /businessId: business\.id/);
  assert.match(body, /revalidatePath\("\/dashboard"\)/);
  assert.match(body, /revalidatePath\("\/businesses"\)/);
  assert.match(body, /\/businesses\?businessDelete=success/);
  assert.match(body, /\? "\/businesses\?businessDelete=success"[\s\S]*: "\/dashboard"/);
  assert.doesNotMatch(body, /redirect\(`\/businesses\/\$\{business\.slug\}/);
});

test("DANGER-1 uses an accessible irreversible dialog without weakening PA routes", () => {
  assert.match(dangerZone, /<Dialog/);
  assert.match(dangerZone, /operation is irreversible/);
  assert.match(dangerZone, /prevent double|pending/);
  assert.match(dangerZone, /role="alert"/);
  assert.match(source("components/ui/dialog.tsx"), /role="dialog"/);
  assert.match(source("components/ui/dialog.tsx"), /aria-modal="true"/);
  assert.match(source("components/ui/dialog.tsx"), /event\.key === "Escape"/);
  assert.match(settings, /<BusinessSettingsForm/);
  assert.match(source("app/businesses/[slug]/program/page.tsx"), /<ProgramRulesForm/);
  assert.equal(existsSync(join(root, "app/onboarding/actions.ts")), true);
  assert.equal(existsSync(join(root, "app/card/[token]/page.tsx")), true);
  assert.equal(existsSync(join(root, "app/join/[slug]/page.tsx")), true);
  assert.equal(
    existsSync(join(root, "prisma/migrations/danger1_business_deletion")),
    false,
  );
});
