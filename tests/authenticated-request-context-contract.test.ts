import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const source = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

const context = source("lib/auth/authenticated-request-context.ts");
const shell = source("components/authenticated-locale-shell.tsx");
const customers = source("app/businesses/[slug]/customers/page.tsx");

test("authenticated request context caches the canonical current-user read", () => {
  assert.match(context, /import \{ cache \} from "react"/);
  assert.match(context, /getAuthenticatedRequestContext = cache\(async \(\) =>/);
  assert.match(context, /const session = await auth\(\)/);
  assert.match(context, /await prisma\.user\.findUnique\(/);

  for (const field of [
    "language",
    "firstName",
    "lastName",
    "email",
    "id",
    "role",
    "experienceAccess",
    "businessId",
    "onboardingStatus",
  ]) {
    assert.match(context, new RegExp(`${field}: true`));
  }

  assert.match(
    context,
    /business:\s*\{\s*select:\s*\{\s*slug: true,\s*name: true,\s*plan: true,/,
  );
});

test("authenticated shell reuses the request context without moving the admin businesses query", () => {
  assert.match(shell, /getAuthenticatedRequestContext\(\)/);
  assert.doesNotMatch(shell, /from "@\/auth"/);
  assert.doesNotMatch(shell, /prisma\.user\.findUnique/);
  assert.match(shell, /prisma\.business\.findMany\(/);
  assert.match(
    shell,
    /select: \{ id: true, name: true, slug: true, plan: true \}/,
  );
  assert.match(shell, /orderBy:/);
});

test("customers reuses the request context instead of issuing a second current-user read", () => {
  assert.match(customers, /getAuthenticatedRequestContext\(\)/);
  assert.match(
    customers,
    /const \{ session, user: authenticatedUser \} = requestContext/,
  );
  assert.doesNotMatch(customers, /from "@\/auth"/);
  assert.doesNotMatch(customers, /prisma\.user\.findUnique/);
});
