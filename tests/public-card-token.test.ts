import assert from "node:assert/strict";
import test from "node:test";
import { extractPublicCardToken } from "@/lib/cards/public-token";

const token = "ckz9s0x2a0001abcde1234567";

test("accepts a raw public card token", () => {
  assert.equal(extractPublicCardToken(` ${token} `), token);
});

test("accepts an exact public card URL", () => {
  assert.equal(
    extractPublicCardToken(`https://app.example.com/card/${token}`),
    token
  );
});

test("rejects invalid tokens and non-card URL paths", () => {
  assert.equal(extractPublicCardToken("short"), null);
  assert.equal(
    extractPublicCardToken(`https://app.example.com/customer/${token}`),
    null
  );
  assert.equal(
    extractPublicCardToken(`https://app.example.com/x/card/${token}`),
    null
  );
});

test("rejects encoded path values that are not safe tokens", () => {
  assert.equal(
    extractPublicCardToken(
      "https://app.example.com/card/%2Fnot-a-token"
    ),
    null
  );
});
