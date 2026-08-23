import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const activity = source("app/businesses/[slug]/activity/page.tsx");
const branches = source("app/businesses/[slug]/branches/page.tsx");
const presentation = source("lib/activity/presentation.ts");

test("P1 Activity and Branches derive presentation language from the authenticated saved User", () => {
  for (const page of [activity, branches]) {
    assert.match(page, /prisma\.user\.findUnique\([\s\S]*?language: true/);
    assert.match(page, /normalizeLanguage\(user\?\.language\)/);
    assert.match(page, /getLanguageLocale\(language\)/);
    assert.doesNotMatch(page, /new Intl\.DateTimeFormat\(["']ar-EG["']/);
  }
});

test("P1 Activity owns bilingual material copy and language-aware activity labels", () => {
  for (const pair of [
    ["سجل النشاط", "Activity log"],
    ["البحث", "Search"],
    ["كل أنواع العمليات", "All activity types"],
    ["مسح الفلاتر", "Clear filters"],
    ["لا توجد عمليات مسجلة", "No activities recorded"],
  ] as const) {
    assert.ok(activity.includes(pair[0]), `missing Activity Arabic copy: ${pair[0]}`);
    assert.ok(activity.includes(pair[1]), `missing Activity English copy: ${pair[1]}`);
  }
  assert.match(activity, /getActivityLabel\(type, language\)/);
  assert.match(activity, /getActivityDescription\(activity, language\)/);
  assert.match(activity, /localizeActivityDescription/);
  assert.match(presentation, /const activityLabelCatalog: Record<AppLanguage/);
  assert.match(presentation, /export function getActivityDescription/);
  assert.match(presentation, /EN:\s*\{/);
  assert.match(presentation, /Customer created/);
});

test("P1 Branches owns bilingual material controls, notices, confirmations and assignment copy", () => {
  for (const pair of [
    ["الفروع والإسنادات", "Branches & assignments"],
    ["إضافة فرع", "Add branch"],
    ["حفظ التعديلات", "Save changes"],
    ["إسنادات الموظفين", "Staff assignments"],
    ["إزالة الإسناد", "Remove assignment"],
    ["لا توجد فروع بعد", "No branches yet"],
  ] as const) {
    assert.ok(branches.includes(pair[0]), `missing Branches Arabic copy: ${pair[0]}`);
    assert.ok(branches.includes(pair[1]), `missing Branches English copy: ${pair[1]}`);
  }
  assert.match(branches, /confirmation=\{branch\.isActive[\s\S]*?Deactivate/);
  assert.match(branches, /subscription-restricted/);
});

test("P1 localization remains presentation-only around canonical route authority", () => {
  assert.match(activity, /canPerform\(session\.user, business\.id, ["']REPORTS_VIEW["']\)/);
  assert.match(activity, /businessId: business\.id/);
  assert.match(branches, /canManageBranches\(session\.user, business\.id\)/);
  for (const action of [
    "createBranchAction",
    "updateBranchAction",
    "setBranchStatusAction",
    "assignStaffToBranchAction",
    "removeStaffAssignmentAction",
  ]) {
    assert.match(branches, new RegExp(action));
  }
});
