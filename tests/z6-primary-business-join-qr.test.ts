import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  businessJoinPath,
  businessJoinUrl,
} from "../lib/customers/business-join-link";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("Z6 defines one canonical business join destination", () => {
  assert.equal(businessJoinPath("coffee-house"), "/join/coffee-house");
  assert.equal(
    businessJoinPath("café/test"),
    "/join/caf%C3%A9%2Ftest",
  );
  assert.equal(
    businessJoinUrl("https://beta.loyalflow.example/", "coffee-house"),
    "https://beta.loyalflow.example/join/coffee-house",
  );
  assert.doesNotMatch(businessJoinPath("coffee-house"), /[?&](ref|branch|campaign)=/);
});

test("Z6 Primary Business QR encodes the canonical join link and fails soft", () => {
  const component = source("components/primary-business-join-qr.tsx");

  assert.match(component, /getRequestBaseUrl/);
  assert.match(component, /businessJoinUrl\(baseUrl, slug\)/);
  assert.match(component, /QRCode\.toDataURL\(joinUrl/);
  assert.match(component, /CopyLinkButton/);
  assert.match(component, /href=\{joinPath\}/);
  assert.match(component, /single primary join path/);
  assert.match(component, /still available to copy or open/);
  assert.doesNotMatch(component, /prisma\.|createPublicMembershipCommand/);
});

test("Z6 Program exposes the primary QR without introducing another join writer", () => {
  const program = source("app/businesses/[slug]/program/page.tsx");
  const joinPage = source("app/join/[slug]/page.tsx");
  const joinAction = source("app/join/[slug]/actions.ts");

  assert.match(program, /PrimaryBusinessJoinQr/);
  assert.match(program, /slug=\{business\.slug\}/);
  assert.match(program, /language=\{language\}/);

  assert.match(joinPage, /joinBusinessAction\.bind\(null, business\.slug\)/);
  assert.match(joinPage, /Create digital card/);
  assert.match(joinAction, /createPublicMembershipCommand/);
  assert.match(
    joinAction,
    /redirect\(`\/card\/\$\{result\.customer\.publicToken\}\?welcome=1`\)/,
  );
});
