import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const source = fs.readFileSync(
  path.join(process.cwd(), "lib/server/customers/audience-context.ts"),
  "utf8",
);

test("audience reward-ready truth requires live unlocks for expiring catalogue rewards", () => {
  assert.match(source, /prisma\.rewardUnlock\.findMany/);
  assert.match(source, /expiresAfterDays:\s*\{\s*gt:\s*0\s*\}/);
  assert.match(source, /getRewardTruth/);
  assert.match(source, /context\.rewardReady\s*=\s*getRewardTruth/);
  assert.match(source, /expiresAfterDays:\s*true/);
});
