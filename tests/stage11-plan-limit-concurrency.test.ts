import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const lockSource = source("lib/server/business/business-capacity-lock.ts");
const capacityWriters = [
  "lib/server/business/customer-create-command.ts",
  "lib/server/business/team-provisioning-command.ts",
  "lib/server/business/branch-creation-command.ts",
  "lib/server/business/offer-write-command.ts",
  "lib/server/business/reward-write-command.ts",
] as const;

test("Stage 11 capacity lock serializes on the canonical Business row", () => {
  assert.match(lockSource, /transaction\.\$queryRaw/);
  assert.match(lockSource, /FROM "Business"/);
  assert.match(lockSource, /WHERE "id" = \$\{businessId\}/);
  assert.match(lockSource, /FOR UPDATE/);
});

test("Stage 11 every plan-capacity writer locks the tenant before reading usage", () => {
  for (const path of capacityWriters) {
    const command = source(path);
    const lock = command.indexOf("await lockBusinessCapacity(");
    const count = command.indexOf(".count(");
    const create = command.indexOf(".create(");

    assert.match(
      command,
      /import \{ lockBusinessCapacity \} from "@\/lib\/server\/business\/business-capacity-lock";/,
      `${path} must import the shared tenant capacity lock`,
    );
    assert.ok(lock >= 0, `${path} must acquire the tenant capacity lock`);
    assert.ok(count >= 0, `${path} must read persisted plan usage`);
    assert.ok(create >= 0, `${path} must contain the resource create`);
    assert.ok(lock < count, `${path} must lock before counting plan usage`);
    assert.ok(lock < create, `${path} must lock before creating capacity`);
  }
});

test("Stage 11 public membership keeps its existing serializable boundary", () => {
  const command = source("lib/server/business/public-membership-command.ts");
  assert.match(command, /isolationLevel: "Serializable"/);
});
