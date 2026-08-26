import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  CUSTOMER_HIGHLIGHT_FRESHNESS_DAYS,
  CUSTOMER_HIGHLIGHT_LIMIT,
  getRecentCustomerHighlights,
} from "../lib/customer-experience/highlights";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("customer highlights select only the latest bounded offer and reward updates", () => {
  const now = new Date("2026-08-26T12:00:00.000Z");
  const result = getRecentCustomerHighlights({
    now,
    offers: [
      {
        id: "new-offer",
        name: "Weekend offer",
        description: "20% off",
        createdAt: new Date("2026-08-25T12:00:00.000Z"),
      },
      {
        id: "old-offer",
        name: "Old offer",
        description: null,
        createdAt: new Date("2026-06-01T12:00:00.000Z"),
      },
    ],
    rewards: [
      {
        id: "new-reward",
        name: "Free coffee",
        description: null,
        createdAt: new Date("2026-08-24T12:00:00.000Z"),
      },
    ],
  });

  assert.equal(CUSTOMER_HIGHLIGHT_FRESHNESS_DAYS, 30);
  assert.equal(CUSTOMER_HIGHLIGHT_LIMIT, 2);
  assert.deepEqual(
    result.map(({ kind, sourceId }) => ({ kind, sourceId })),
    [
      { kind: "OFFER", sourceId: "new-offer" },
      { kind: "REWARD", sourceId: "new-reward" },
    ],
  );
});

test("public card highlights retain eligibility and use local seen-state only", () => {
  const page = source("app/card/[token]/page.tsx");
  const component = source(
    "components/customer-experience/customer-new-highlights.tsx",
  );
  const copy = source("lib/customer-experience/public-copy.ts");

  assert.match(page, /publicOffers = business\.offers\.filter/);
  assert.match(page, /offers: publicOffers/);
  assert.match(page, /rewards: business\.rewards/);
  assert.match(page, /<CustomerNewHighlights/);
  assert.match(page, /createHash\("sha256"\)/);
  assert.match(component, /loyalflow:customer-highlights:v1/);
  assert.match(component, /MAX_SEEN_HIGHLIGHTS = 20/);
  assert.match(component, /useSyncExternalStore/);
  assert.match(component, /aria-label=\{copy\.dismissHighlight\}/);
  assert.match(component, /role="status"/);
  assert.doesNotMatch(component, /fetch\(|axios|prisma|publicToken/);
  assert.match(copy, /newForYou:/);
  assert.match(copy, /newOffer:/);
  assert.match(copy, /newReward:/);
});
