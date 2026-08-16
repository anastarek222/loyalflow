from pathlib import Path
import re

actions_path = Path("app/businesses/[slug]/users/actions.ts")
text = actions_path.read_text()

import_anchor = 'import { createBusinessNotification } from "@/lib/notifications";\n'
import_line = 'import { provisionBusinessUserCommand } from "@/lib/server/business/team-provisioning-command";\n'
if import_line not in text:
    if import_anchor not in text:
        raise SystemExit("expected notification import anchor missing")
    text = text.replace(import_anchor, import_anchor + import_line, 1)

start = text.index("export async function createBusinessUserAction")
end = text.index("export async function updateBusinessUserExperienceAccessAction")
before = text[:start]
block = text[start:end]
after = text[end:]

pattern = re.compile(
    r"  const activityContext = await getActivityRequestContext\(\);\n\n"
    r"  const created = await prisma\.\$transaction\([\s\S]*?\n"
    r"  if \(!created\) \{\n"
    r"    redirect\(`/businesses/\$\{slug\}/users\?error=subscription-restricted`\);\n"
    r"  \}\n"
)
if len(pattern.findall(block)) != 1:
    raise SystemExit("expected exactly one create transaction block")

replacement = '''  const creation = await provisionBusinessUserCommand({
    businessId: business.id,
    actor: session.user,
    firstName: parsed.data.firstName,
    lastName: parsed.data.lastName || null,
    email,
    passwordHash,
    role: parsed.data.role,
    experienceAccess: resolveExperienceAccess(
      parsed.data.role,
      parsed.data.experienceAccess ?? getDefaultExperienceAccess(parsed.data.role),
    ),
  });

  if (!creation.ok) {
    if (creation.reason === "BUSINESS_NOT_FOUND") {
      redirect("/businesses");
    }
    const error =
      creation.reason === "PLAN_LIMIT"
        ? "plan-limit"
        : creation.reason === "OWNER_EXISTS"
          ? "owner-exists"
          : creation.reason === "EMAIL_EXISTS"
            ? "email"
            : "subscription-restricted";
    redirect(`/businesses/${slug}/users?error=${error}`);
  }
'''
block = pattern.sub(replacement, block, count=1)
actions_path.write_text(before + block + after)

test_path = Path("tests/team-direct-login-readiness.test.ts")
test_path.write_text('''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const teamActions = readFileSync("app/businesses/[slug]/users/actions.ts", "utf8");
const teamCommand = readFileSync("lib/server/business/team-provisioning-command.ts", "utf8");
const authSource = readFileSync("auth.ts", "utf8");

const createTeamUser = teamActions.slice(
  teamActions.indexOf("export async function createBusinessUserAction"),
  teamActions.indexOf("export async function updateBusinessUserExperienceAccessAction"),
);

test("trusted team provisioning creates immediately sign-in-ready accounts", () => {
  assert.match(createTeamUser, /await getManagementContext\\(slug\\)/);
  assert.match(createTeamUser, /!isBusinessOwner && !isSuperAdmin/);
  assert.match(createTeamUser, /passwordHash/);
  assert.match(createTeamUser, /provisionBusinessUserCommand/);
  assert.match(createTeamUser, /businessId:\\s*business\\.id/);

  assert.match(teamCommand, /transaction\\.user\\.create/);
  assert.match(teamCommand, /businessId: input\\.businessId/);
  assert.match(teamCommand, /isActive:\\s*true/);
  assert.match(
    teamCommand,
    /INSERT INTO "EmailVerificationState"[\\s\\S]*\\$\\{createdUser\\.id\\},\\s*CURRENT_TIMESTAMP,\\s*CURRENT_TIMESTAMP,\\s*CURRENT_TIMESTAMP/,
  );
  assert.doesNotMatch(teamCommand, /EmailVerificationToken/);
  assert.doesNotMatch(teamCommand, /sendEmailVerificationEmail/);
});

test("credentials login still requires the canonical verification policy", () => {
  assert.match(authSource, /isEmailVerificationSatisfied\\(user\\.id\\)/);
  assert.match(authSource, /!user \\|\\| !user\\.isActive/);
});
''')
