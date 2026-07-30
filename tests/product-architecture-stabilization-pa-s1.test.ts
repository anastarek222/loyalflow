import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getAdministrationNavigation } from "@/lib/administration/navigation";
import {
  customerMessagesSettingsSchema,
  getCustomerMessagesUpdate,
  getOperationsSettingsUpdate,
  getProgramRulesUpdate,
  operationsSettingsSchema,
  programRulesSettingsSchema,
} from "@/lib/business/settings-domains";

const source = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

const program = source("app/businesses/[slug]/program/page.tsx");
const settings = source("app/businesses/[slug]/settings/page.tsx");
const actions = source("app/businesses/[slug]/settings/actions.ts");

function actionBody(name: string, nextName: string) {
  return actions.slice(
    actions.indexOf(`export async function ${name}`),
    actions.indexOf(`export async function ${nextName}`),
  );
}

test("PA-S1 keeps Program authorization aligned with Settings and hides unusable navigation", () => {
  for (const page of [settings, program]) {
    assert.match(page, /const session = await auth\(\)/);
    assert.match(
      page,
      /prisma\.business\.findUnique\(\{[\s\S]*?where:\s*\{[\s\S]*?slug/,
    );
    assert.match(page, /if \(!business\)[\s\S]*?notFound\(\)/);
    assert.match(page, /canManageBusiness\(session\.user, business\.id\)/);
    assert.match(page, /redirect\("\/dashboard"\)/);
  }

  const owner = getAdministrationNavigation(
    { role: "OWNER", businessId: "business-a" },
    "business-a",
    "tenant-slug",
    "EN",
  );
  assert.equal(owner.filter((item) => item.id === "program").length, 1);
  assert.equal(
    owner.find((item) => item.id === "program")?.href,
    "/businesses/tenant-slug/program",
  );
  for (const role of ["MANAGER", "STAFF"] as const) {
    assert.equal(
      getAdministrationNavigation(
        { role, businessId: "business-a" },
        "business-a",
        "tenant-slug",
      ).some((item) => item.id === "program"),
      false,
    );
  }
  assert.equal(
    getAdministrationNavigation(
      { role: "OWNER", businessId: "business-b" },
      "business-a",
      "tenant-slug",
    ).some((item) => item.id === "program"),
    false,
  );
});

test("PA-S1 keeps form feedback and redirects isolated by destination and query key", () => {
  const rules = actionBody(
    "updateProgramRulesAction",
    "updateCustomerMessagesAction",
  );
  const messages = actionBody(
    "updateCustomerMessagesAction",
    "updateOperationsSettingsAction",
  );
  const operations = actionBody(
    "updateOperationsSettingsAction",
    "updateBusinessCardDesignAction",
  );
  const card = actionBody(
    "updateBusinessCardDesignAction",
    "syncGoogleSheetAction",
  );

  assert.match(rules, /\/program\?program=(?:invalid|saved)/);
  assert.doesNotMatch(rules, /\?(?:messages|cardDesign|operations)=/);
  assert.match(messages, /\/program\?messages=(?:invalid|saved)/);
  assert.doesNotMatch(messages, /\?(?:program|cardDesign|operations)=/);
  assert.match(card, /\/program\?cardDesign=/);
  assert.doesNotMatch(card, /\?(?:program|messages|operations)=/);
  assert.match(operations, /\/settings\?operations=(?:invalid|saved)/);
  assert.doesNotMatch(operations, /\/program\?/);

  assert.match(program, /query\.program/);
  assert.match(program, /query\.cardDesign/);
  assert.match(program, /query\.messages/);
  assert.doesNotMatch(settings, /query\.(?:program|cardDesign|messages)/);
});

test("PA-S1 domain payloads are pairwise disjoint", () => {
  const rules = Object.keys(
    getProgramRulesUpdate(
      programRulesSettingsSchema.parse({
        loyaltyProgramName: "Club",
        pointsName: "Points",
        welcomeMessage: "Welcome",
        cardDefaultLanguage: "EN",
        loyaltyMode: "POINTS",
        unitName: "Points",
        rewardName: "Gift",
        rewardType: "GIFT",
        rewardCode: "",
        rewardDescription: "",
        rewardThreshold: 10,
        earnAmount: 1,
      }),
    ),
  );
  const messages = Object.keys(
    getCustomerMessagesUpdate(
      customerMessagesSettingsSchema.parse({
        whatsappWelcomeMessage: "Welcome",
        whatsappBalanceMessage: "Balance",
        whatsappRewardMessage: "Reward",
      }),
    ),
  );
  const operations = Object.keys(
    getOperationsSettingsUpdate(
      operationsSettingsSchema.parse({ staffAttributionMode: "OPTIONAL" }),
    ),
  );

  for (const [left, right] of [
    [rules, messages],
    [rules, operations],
    [messages, operations],
  ]) {
    assert.deepEqual(left.filter((field) => right.includes(field)), []);
  }
});

test("PA-S1 keeps one card editor, separate forms, bilingual copy, and accessible feedback", () => {
  assert.equal((program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.equal((program.match(/<form\b/g) ?? []).length, 1);
  assert.equal((program.match(/<\/form>/g) ?? []).length, 1);
  assert.match(program, /customer messages in one workspace/);
  assert.match(program, /رسائل العملاء من مساحة عمل واحدة/);
  assert.match(program, /role="status" aria-live="polite"/);
  assert.match(program, /role="alert"/);
  assert.match(settings, /business profile, operations, and integrations/);
  assert.match(settings, /الملف التعريفي والتشغيل والتكاملات/);
  assert.doesNotMatch(settings, /Configure the loyalty programme and digital card/);
});
