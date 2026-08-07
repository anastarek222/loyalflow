import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionPath =
  "app/businesses/[slug]/customers/[customerId]/redemption-reversal-actions.ts";

async function readAction() {
  return readFile(actionPath, "utf8");
}

test("redemption reversal action stays isolated from existing customer action code", async () => {
  const source = await readAction();

  assert.match(source, /recordRedemptionReversal/);
  assert.doesNotMatch(source, /from "\.\/actions"/);
});

test("redemption reversal action validates exact redemption transaction and operation identity", async () => {
  const source = await readAction();

  assert.match(source, /originalRedemptionId/);
  assert.match(source, /originalTransactionId/);
  assert.match(source, /operationId: z\.string\(\)\.uuid\(\)/);
  assert.match(source, /reason: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(500\)/);
  assert.match(source, /restoreUnlock/);
});

test("redemption reversal action is owner or super admin only and tenant scopes the customer", async () => {
  const source = await readAction();

  assert.match(source, /actor\.role === "SUPER_ADMIN"/);
  assert.match(source, /actor\.role === "OWNER"/);
  assert.match(source, /actor\.businessId === business\.id/);
  assert.match(source, /businessId: business\.id/);
  assert.match(source, /isActive: true/);
});

test("redemption reversal action delegates one guarded transaction and maps bounded outcomes", async () => {
  const source = await readAction();

  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /recordRedemptionReversal\(transaction/);
  assert.match(source, /redemption-reversal-conflict/);
  assert.match(source, /redemption-reversal-context/);
  assert.match(source, /redemption-reversal-aborted/);
  assert.match(source, /redemption-reversal-original-missing/);
  assert.match(source, /redemption-reversal-complete/);
  assert.match(source, /redemption-reversal-unlock-unsupported/);
  assert.match(source, /success=redemption-reversed/);
});

test("redemption reversal action refreshes only affected customer business report and card surfaces", async () => {
  const source = await readAction();

  assert.match(source, /revalidatePath\(`\/businesses\/\$\{slug\}\/customers\/\$\{customerId\}`\)/);
  assert.match(source, /revalidatePath\(`\/businesses\/\$\{slug\}\/reports`\)/);
  assert.match(source, /revalidatePath\(`\/card\/\$\{publicToken\}`\)/);
  assert.match(source, /syncBusinessToGoogleSheetSafely\(business\.id\)/);
});
