import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");
const programPath = "app/businesses/[slug]/program/page.tsx";
const program = source(programPath);
const settings = source("app/businesses/[slug]/settings/page.tsx");
const settingsForm = source("components/business-settings-form.tsx");
const actions = source("app/businesses/[slug]/settings/actions.ts");
const navigation = source("lib/administration/navigation.ts");
const englishNavigation = source("packages/i18n/src/locales/en/navigation.ts");

test("PA-3A creates a protected tenant-scoped programme workspace", () => {
  assert.equal(existsSync(join(root, programPath)), true);
  assert.match(program, /const session = await auth\(\)/);
  assert.match(program, /prisma\.business\.findUnique\(\{\s*where: \{ slug \},\s*include:/);
  assert.match(program, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(program, /if \(!business\) notFound\(\)/);
  assert.match(program, /redirect\("\/dashboard"\)/);
});

test("programme workspace owns earning rules and the canonical card editor", () => {
  assert.equal((program.match(/<ProgramRulesForm/g) ?? []).length, 1);
  assert.equal((program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.match(program, /language=\{language\}/);
  assert.match(program, /allowCustom=\{session\.user\.role === "SUPER_ADMIN"\}/);
  assert.match(actions, /getAuthorizedCardDesignUpdate/);
});

test("Settings no longer renders programme rules or card customization", () => {
  assert.doesNotMatch(settings, /ProgramRulesForm|StandardCardSetup|updateProgramRulesAction|updateBusinessCardDesignAction/);
  assert.doesNotMatch(settingsForm, /actions\.program|status\.program|name="loyaltyMode"/);
  assert.match(settings, /<BusinessSettingsForm/);
  assert.match(settingsForm, /actions\.profile/);
  assert.match(settingsForm, /actions\.operations/);
});

test("existing domain actions remain narrow and revalidate the programme route", () => {
  const start = actions.indexOf("export async function updateProgramRulesAction");
  const end = actions.indexOf("export async function updateCustomerMessagesAction");
  const programAction = actions.slice(start, end);
  assert.match(programAction, /await getManagedBusiness\(slug\)/);
  assert.match(programAction, /programRulesSettingsSchema\.safeParse/);
  assert.match(
    programAction,
    /const nextProgramme = getProgramRulesUpdate\(parsed\.data\)/,
  );
  assert.match(programAction, /data: nextProgramme/);
  assert.doesNotMatch(programAction, /name:|whatsappWelcomeMessage|staffAttributionEnabled/);
  assert.match(actions, /revalidatePath\(`\/businesses\/\$\{input\.slug\}\/program`\)/);
  assert.match(actions, /\/program\?program=saved/);
  assert.match(actions, /\/program\?cardDesign=saved/);
});

test("one minimal administration item makes the programme route discoverable", () => {
  assert.match(navigation, /id: "program"/);
  assert.match(navigation, /`\/businesses\/\$\{slug\}\/program`/);
  assert.match(englishNavigation, /Loyalty Program/);
  assert.doesNotMatch(
    navigation,
    /rewards[\s\S]*program|program[\s\S]*rewards/,
  );
});

test("PA-1 legacy UI, public card, join flow, and persistence stay out of PA-3A", () => {
  assert.doesNotMatch(
    `${program}\n${settingsForm}`,
    /themeOptions|cardStyleOptions|معاينة مباشرة للكارت|name="qrStyle"|name="membershipName"/,
  );
  assert.equal(existsSync(join(root, "app/card/[token]/page.tsx")), true);
  assert.equal(existsSync(join(root, "app/join/[slug]/page.tsx")), true);
  assert.doesNotMatch(program, /prisma\.(?:business\.)?(?:create|update)|schema\.prisma|migration/);
});
