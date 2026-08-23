import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => readFileSync(join(root, file), "utf8");

test("Add Business resolves and propagates the authenticated language", () => {
  const page = source("app/businesses/new/page.tsx");
  const experience = source("components/add-business-experience.tsx");

  assert.match(page, /normalizeLanguage\(currentUser\?\.language\)/);
  assert.match(page, /language=\{language\}/);
  assert.match(experience, /<BusinessSetupWizard[\s\S]*language=\{language\}/);
  assert.match(experience, /<OwnerInvitationForm[\s\S]*language=\{language\}/);
  assert.match(experience, /إضافة نشاط تجاري/);
  assert.match(experience, /Add business/);
});

test("Business Setup Wizard keeps the canonical six-step order in both languages", () => {
  const wizard = source("components/business-setup-wizard.tsx");

  assert.match(wizard, /\["Business", "Owner", "Billing", "Loyalty", "Card Design", "Review"\]/);
  assert.match(wizard, /\["النشاط", "المالك", "الفوترة", "الولاء", "تصميم البطاقة", "المراجعة"\]/);
  assert.match(wizard, /getBusinessSetupValidationIssue\(formData, step as SetupStep\)/);
  assert.match(wizard, /getBusinessSetupValidationIssue\(data\)/);
  assert.match(wizard, /disabled=\{index > step\}/);
});

test("Business Setup Wizard no longer forces English card setup", () => {
  const wizard = source("components/business-setup-wizard.tsx");

  assert.match(wizard, /<StandardCardSetup[\s\S]*language=\{language\}/);
  assert.doesNotMatch(wizard, /language="EN"/);
  assert.match(wizard, /defaultValue=\{copy\.defaultUnit\}/);
  assert.match(wizard, /defaultValue=\{copy\.defaultReward\}/);
});

test("Owner invitation copy and controls are bilingual and semantic", () => {
  const form = source("components/owner-invitation-form.tsx");

  assert.match(form, /إرسال دعوة المالك/);
  assert.match(form, /Send owner invitation/);
  assert.match(form, /text-primary-foreground/);
  assert.doesNotMatch(form, /text-white|bg-white|bg-primary-subtle/);
});
