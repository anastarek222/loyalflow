import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDateInputInTimeZone,
  formatUtcDateInput,
  getDefaultReportDateRange,
  getDefaultUtcDateRange,
  getReportPresetDateRange,
  parseReportDateRange,
  parseUtcDateInput,
} from "@/lib/analytics/date-range";

test("parses valid UTC date boundaries", () => {
  assert.equal(
    parseUtcDateInput("2024-02-29")?.toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
  assert.equal(
    parseUtcDateInput("2024-02-29", true)?.toISOString(),
    "2024-02-29T23:59:59.999Z",
  );
});

test("rejects impossible and malformed date inputs", () => {
  assert.equal(parseUtcDateInput("2024-02-30"), null);
  assert.equal(parseUtcDateInput("2024-2-9"), null);
  assert.equal(parseUtcDateInput(null), null);
});

test("builds an inclusive UTC thirty-day default range", () => {
  const range = getDefaultUtcDateRange(
    new Date("2026-07-20T17:35:00.000Z"),
  );

  assert.equal(range.fromInput, "2026-06-21");
  assert.equal(range.toInput, "2026-07-20");
  assert.equal(formatUtcDateInput(range.from), "2026-06-21");
  assert.equal(range.to.toISOString(), "2026-07-20T23:59:59.999Z");
});

test("today follows the business local calendar instead of UTC", () => {
  const now = new Date("2026-01-15T02:30:00.000Z");
  const range = getReportPresetDateRange("today", now, "America/New_York");

  assert.equal(range.fromInput, "2026-01-14");
  assert.equal(range.toInput, "2026-01-14");
  assert.equal(range.from.toISOString(), "2026-01-14T05:00:00.000Z");
  assert.equal(range.toExclusive.toISOString(), "2026-01-15T05:00:00.000Z");
});

test("DST spring-forward report day is 23 hours", () => {
  const range = parseReportDateRange({
    from: "2026-03-08",
    to: "2026-03-08",
    timeZone: "America/New_York",
  });

  assert.ok(range);
  assert.equal(range.from.toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(range.toExclusive.toISOString(), "2026-03-09T04:00:00.000Z");
  assert.equal(
    range.toExclusive.getTime() - range.from.getTime(),
    23 * 60 * 60 * 1000,
  );
});

test("DST fall-back report day is 25 hours", () => {
  const range = parseReportDateRange({
    from: "2026-11-01",
    to: "2026-11-01",
    timeZone: "America/New_York",
  });

  assert.ok(range);
  assert.equal(range.from.toISOString(), "2026-11-01T04:00:00.000Z");
  assert.equal(range.toExclusive.toISOString(), "2026-11-02T05:00:00.000Z");
  assert.equal(
    range.toExclusive.getTime() - range.from.getTime(),
    25 * 60 * 60 * 1000,
  );
});

test("custom ranges use local midnights and preserve calendar-day limits", () => {
  const range = parseReportDateRange({
    from: "2026-03-07",
    to: "2026-03-09",
    timeZone: "America/New_York",
  });

  assert.ok(range);
  assert.equal(range.from.toISOString(), "2026-03-07T05:00:00.000Z");
  assert.equal(range.toExclusive.toISOString(), "2026-03-10T04:00:00.000Z");
});

test("7d and 30d presets count business calendar dates, not elapsed 24-hour blocks", () => {
  const now = new Date("2026-03-09T16:00:00.000Z");
  const seven = getReportPresetDateRange("7d", now, "America/New_York");
  const thirty = getReportPresetDateRange("30d", now, "America/New_York");

  assert.equal(seven.fromInput, "2026-03-03");
  assert.equal(seven.toInput, "2026-03-09");
  assert.equal(thirty.fromInput, "2026-02-08");
  assert.equal(thirty.toInput, "2026-03-09");
});

test("date inputs are formatted in the requested business timezone", () => {
  const instant = new Date("2026-09-13T01:30:00.000Z");

  assert.equal(formatDateInputInTimeZone(instant, "America/New_York"), "2026-09-12");
  assert.equal(formatDateInputInTimeZone(instant, "Africa/Cairo"), "2026-09-13");
});

test("business report defaults use the business local date", () => {
  const range = getDefaultReportDateRange(
    new Date("2026-09-13T01:30:00.000Z"),
    30,
    "America/New_York",
  );

  assert.equal(range.toInput, "2026-09-12");
  assert.equal(range.fromInput, "2026-08-14");
});
