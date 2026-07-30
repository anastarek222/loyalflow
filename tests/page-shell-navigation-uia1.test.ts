import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildShellNavigation,
  getShellPageContext,
} from "@/lib/app-shell-navigation";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

const pagePaths = {
  activity: "app/businesses/[slug]/activity/page.tsx",
  branches: "app/businesses/[slug]/branches/page.tsx",
  playbooks: "app/businesses/[slug]/playbooks/page.tsx",
  program: "app/businesses/[slug]/program/page.tsx",
  settings: "app/businesses/[slug]/settings/page.tsx",
  team: "app/businesses/[slug]/users/page.tsx",
} as const;

const pages = Object.fromEntries(
  Object.entries(pagePaths).map(([name, path]) => [name, source(path)]),
) as Record<keyof typeof pagePaths, string>;

const business = {
  id: "business-a",
  name: "North Star",
  slug: "north-star",
};

function navigationIds(
  user:
    | { role: "OWNER"; businessId: string }
    | { role: "MANAGER" | "STAFF" | "VIEWER"; businessId: string },
  experienceMode: "SIMPLE" | "ADVANCED" = "ADVANCED",
) {
  return buildShellNavigation({
    language: "EN",
    user,
    business,
    experienceMode,
  })
    .flatMap((group) => group.items)
    .map((item) => item.id);
}

test("UIA-1 Team and Branches use the standard light workspace shell", () => {
  for (const page of [pages.team, pages.branches]) {
    assert.match(
      page,
      /<main className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">/,
    );
    assert.doesNotMatch(page, /background:\s*theme\.backgroundColor/);
    assert.doesNotMatch(page, /getBusinessTheme/);
    assert.doesNotMatch(page, /bg-(?:black|slate-950|gray-950)[^"]*min-h-screen/);
  }
});

test("UIA-1 Activity and Playbooks headers remain readable on the light shell", () => {
  assert.match(pages.activity, /<h1[^>]*text-foreground/);
  assert.match(pages.activity, /text-foreground-muted/);
  assert.doesNotMatch(
    pages.activity,
    /<header(?:(?!<\/header>)[\s\S])*text-white/,
  );
  assert.match(pages.playbooks, /<h1[^>]*text-foreground/);
  assert.match(pages.playbooks, /text-foreground-muted/);
  assert.doesNotMatch(
    pages.playbooks,
    /<header(?:(?!<\/header>)[\s\S])*text-white/,
  );
});

test("UIA-1 removes duplicate administration navigation from normal business pages", () => {
  for (const name of [
    "settings",
    "program",
    "team",
    "branches",
    "playbooks",
  ] as const) {
    assert.doesNotMatch(pages[name], /AdministrationNavigation/);
  }
});

test("UIA-1 exposes Program once in the sidebar only to route-authorized users", () => {
  const ownerAdvanced = navigationIds({
    role: "OWNER",
    businessId: business.id,
  });
  const ownerSimple = navigationIds(
    { role: "OWNER", businessId: business.id },
    "SIMPLE",
  );
  assert.equal(ownerAdvanced.filter((id) => id === "program").length, 1);
  assert.equal(ownerSimple.filter((id) => id === "program").length, 1);

  for (const role of ["MANAGER", "STAFF", "VIEWER"] as const) {
    const ids = navigationIds({ role, businessId: business.id });
    assert.equal(ids.includes("program"), false);
  }
  assert.equal(
    navigationIds({
      role: "OWNER",
      businessId: "another-business",
    }).includes("program"),
    false,
  );
});

test("UIA-1 preserves Program route protection and shell page context", () => {
  assert.match(pages.program, /const session = await auth\(\)/);
  assert.match(pages.program, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(pages.program, /if \(!business\) notFound\(\)/);
  assert.match(pages.program, /redirect\("\/dashboard"\)/);
  assert.deepEqual(
    getShellPageContext(
      "/businesses/north-star/program",
      "EN",
      business,
    ),
    { title: "Loyalty Program", parent: business.name },
  );
});

test("UIA-1 preserves business routes and the PA architecture", () => {
  for (const path of Object.values(pagePaths)) {
    assert.equal(existsSync(join(root, path)), true);
  }
  assert.equal((pages.program.match(/<ProgramRulesForm/g) ?? []).length, 1);
  assert.equal((pages.program.match(/<StandardCardSetup/g) ?? []).length, 1);
  assert.equal((pages.program.match(/<CustomerMessagesForm/g) ?? []).length, 1);
  assert.doesNotMatch(
    pages.settings,
    /ProgramRulesForm|StandardCardSetup|CustomerMessagesForm/,
  );
  assert.equal(
    existsSync(join(root, "prisma/migrations/uia1_page_shell_navigation")),
    false,
  );
});
