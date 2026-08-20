import assert from "node:assert/strict";
import test from "node:test";

import { offerInputSchema } from "@/lib/offers/catalog";
import { parseOfferFormInput } from "@/lib/offers/form-input";

function offerForm(eligibility: "ALL" | "VIP" | "SEGMENT", segment = "AT_RISK") {
  const formData = new FormData();
  formData.set("name", "Summer offer");
  formData.set("eligibility", eligibility);
  formData.set("segment", segment);
  return formData;
}

test("offer form drops a stale segment when eligibility changes to ALL", () => {
  const parsed = parseOfferFormInput(offerForm("ALL"));

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.eligibility, "ALL");
  assert.equal(parsed.data.segment, undefined);
});

test("offer form drops a stale segment when eligibility changes to VIP", () => {
  const parsed = parseOfferFormInput(offerForm("VIP"));

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.eligibility, "VIP");
  assert.equal(parsed.data.segment, undefined);
});

test("offer form preserves the selected segment for SEGMENT eligibility", () => {
  const parsed = parseOfferFormInput(offerForm("SEGMENT", "REWARD_READY"));

  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.eligibility, "SEGMENT");
  assert.equal(parsed.data.segment, "REWARD_READY");
});

test("strict offer schema still rejects non-segment eligibility carrying a segment", () => {
  const parsed = offerInputSchema.safeParse({
    name: "Summer offer",
    eligibility: "ALL",
    segment: "AT_RISK",
  });

  assert.equal(parsed.success, false);
  assert.match(
    parsed.success ? "" : parsed.error.issues.map((issue) => issue.message).join(" "),
    /Only segment offers can store a segment/,
  );
});
