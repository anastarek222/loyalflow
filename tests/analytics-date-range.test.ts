import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUtcDateInput,
  getDefaultUtcDateRange,
  parseUtcDateInput,
} from "@/lib/analytics/date-range";

test("parses valid UTC date boundaries", () => {
  assert.equal(
    parseUtcDateInput("2024-02-29")?.toISOString(),
    "2024-02-29T00:00:00.000Z"
  );
  assert.equal(
    parseUtcDateInput("2024-02-29", true)?.toISOString(),
    "2024-02-29T23:59:59.999Z"
  );
});

test("rejects impossible and malformed date inputs", () => {
  assert.equal(parseUtcDateInput("2024-02-30"), null);
  assert.equal(parseUtcDateInput("2024-2-9"), null);
  assert.equal(parseUtcDateInput(null), null);
});

test("builds an inclusive UTC thirty-day default range", () => {
  const range = getDefaultUtcDateRange(
    new Date("2026-07-20T17:35:00.000Z")
  );

  assert.equal(range.fromInput, "2026-06-21");
  assert.equal(range.toInput, "2026-07-20");
  assert.equal(formatUtcDateInput(range.from), "2026-06-21");
  assert.equal(range.to.toISOString(), "2026-07-20T23:59:59.999Z");
});
