import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath =
  "app/businesses/[slug]/reports/reversal-exceptions/page.tsx";
const panelPath =
  "app/businesses/[slug]/reports/reversal-exception-resolution-panel.tsx";
const actionPath =
  "app/businesses/[slug]/reports/reversal-exception-actions.ts";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("resolution workspace is owner or super admin only and keeps tenant scope authoritative", async () => {
  const source = await read(pagePath);

  assert.match(source, /session\.user\.role === "SUPER_ADMIN"/);
  assert.match(source, /session\.user\.role === "OWNER"/);
  assert.match(source, /session\.user\.businessId === business\.id/);
  assert.match(source, /businessId: business\.id/);
});

test("resolution workspace reads only bounded open insufficient-balance exceptions", async () => {
  const source = await read(pagePath);

  assert.match(source, /prisma\.reversalException\.findMany/);
  assert.match(source, /status: "OPEN"/);
  assert.match(source, /blockReason: "INSUFFICIENT_BALANCE"/);
  assert.match(source, /take: 50/);
  assert.match(source, /originalTransaction:/);
  assert.match(source, /customer:/);
});

test("owner UI submits exact exception identity and a bounded mandatory resolution note", async () => {
  const source = await read(panelPath);

  assert.match(source, /name="exceptionId"/);
  assert.match(source, /name="resolutionNote"/);
  assert.match(source, /required/);
  assert.match(source, /minLength=\{1\}/);
  assert.match(source, /maxLength=\{500\}/);
  assert.match(source, /resolveReversalExceptionAction\.bind\(null, slug\)/);
});

test("resolution UI explicitly remains operational and never presents a balance or ledger mutation", async () => {
  const source = await read(panelPath);

  assert.match(source, /does not change customer balance or the ledger/);
  assert.doesNotMatch(source, /customer\.update/);
  assert.doesNotMatch(source, /loyaltyTransaction\.create/);
  assert.doesNotMatch(source, /ADJUSTMENT/);
});

test("resolution action returns to the dedicated workspace and refreshes both reports surfaces", async () => {
  const source = await read(actionPath);

  assert.match(source, /reports\/reversal-exceptions/);
  assert.match(source, /revalidatePath\(`\/businesses\/\$\{slug\}\/reports`\)/);
  assert.match(source, /revalidatePath\(resolutionWorkspace\(slug\)\)/);
  assert.match(source, /reversal-exception-resolution-replayed/);
  assert.match(source, /reversal-exception-resolved/);
});
