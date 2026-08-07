import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionPath =
  "app/businesses/[slug]/reports/reversal-exception-actions.ts";

async function readAction() {
  return readFile(actionPath, "utf8");
}

test("reversal exception resolution action stays isolated from report page code", async () => {
  const source = await readAction();

  assert.match(source, /resolveReversalException/);
  assert.doesNotMatch(source, /from "\.\/page"/);
});

test("resolution action validates the exact exception id and a bounded mandatory note", async () => {
  const source = await readAction();

  assert.match(source, /exceptionId: opaqueIdSchema/);
  assert.match(
    source,
    /resolutionNote: z\.string\(\)\.trim\(\)\.min\(1\)\.max\(500\)/,
  );
  assert.match(source, /formData\.get\("exceptionId"\)/);
  assert.match(source, /formData\.get\("resolutionNote"\)/);
});

test("resolution action is owner or super admin only and sends the canonical tenant id to the domain command", async () => {
  const source = await readAction();

  assert.match(source, /actor\.role === "SUPER_ADMIN"/);
  assert.match(source, /actor\.role === "OWNER"/);
  assert.match(source, /actor\.businessId === business\.id/);
  assert.match(source, /businessId: business\.id/);
  assert.match(source, /exceptionId: parsedInput\.data\.exceptionId/);
  assert.match(source, /resolutionNote: parsedInput\.data\.resolutionNote/);
});

test("resolution action delegates one guarded transaction and maps bounded outcomes", async () => {
  const source = await readAction();

  assert.match(source, /prisma\.\$transaction/);
  assert.match(source, /resolveReversalException\(transaction/);
  assert.match(source, /reversal-exception-invalid/);
  assert.match(source, /reversal-exception-permission/);
  assert.match(source, /reversal-exception-context/);
  assert.match(source, /reversal-exception-aborted/);
  assert.match(source, /reversal-exception-missing/);
  assert.match(source, /reversal-exception-already-resolved/);
  assert.ok(
    source.includes("reversal-exception-resolved"),
    "resolution action should redirect to the resolved success state",
  );
  assert.match(source, /reversal-exception-resolution-replayed/);
});

test("resolution action refreshes only the affected reports surface and performs no financial synchronization", async () => {
  const source = await readAction();

  assert.match(source, /revalidatePath\(`\/businesses\/\$\{slug\}\/reports`\)/);
  assert.doesNotMatch(source, /syncBusinessToGoogleSheetSafely/);
  assert.doesNotMatch(source, /loyaltyTransaction\./);
  assert.doesNotMatch(source, /customer\.update/);
});
