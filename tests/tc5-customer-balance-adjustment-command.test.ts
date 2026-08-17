import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const command = source(
  "lib/server/business/customer-balance-adjustment-command.ts",
);
const action = source(
  "app/businesses/[slug]/customers/[customerId]/balance-adjustment-action.ts",
);
const facade = source(
  "app/businesses/[slug]/customers/[customerId]/actions.ts",
);

test("TC5 balance adjustment command owns the authoritative transaction and canonical financial helper", () => {
  assert.match(command, /prisma\.\$transaction/);
  assert.match(command, /recordBalanceAdjustment\(transaction/);
  assert.match(command, /idempotencyKey: input\.idempotencyKey/);
  assert.match(command, /actor: input\.actor/);
  assert.doesNotMatch(command, /redirect\(|revalidatePath|syncBusinessToGoogleSheetSafely/);
});

test("TC5 bounded balance adjustment action preserves auth capability parsing and presentation responsibilities", () => {
  assert.match(action, /await auth\(\)/);
  assert.match(action, /canAccessBusiness\(session\.user, business\.id\)/);
  assert.match(action, /canPerform\(session\.user, business\.id, "LOYALTY_ADJUST"\)/);
  assert.match(action, /adjustmentSchema\.safeParse/);
  assert.match(action, /financialOperationSchema\.safeParse/);
  assert.match(action, /adjustCustomerBalanceCommand\(/);
  assert.match(action, /isFinancialOperationConflictError/);
  assert.match(action, /syncBusinessToGoogleSheetSafely/);
  assert.match(action, /revalidateCustomerBalanceSurfaces/);
  assert.doesNotMatch(action, /prisma\.\$transaction/);
  assert.doesNotMatch(action, /recordBalanceAdjustment\(/);
});

test("TC5 balance adjustment is adopted through the active compatibility facade", () => {
  assert.match(
    facade,
    /adjustCustomerBalanceCommandAction as adjustCustomerBalanceAction/,
  );
  assert.match(facade, /from "\.\/balance-adjustment-action"/);
});
