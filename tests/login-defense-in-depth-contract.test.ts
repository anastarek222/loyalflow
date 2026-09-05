import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("credentials login keeps the IP gate and adds a hashed account gate", () => {
  const authSource = read("auth.ts");
  const securitySource = read("lib/auth/login-security.ts");

  assert.match(authSource, /createLoginAccountKey/);
  assert.match(securitySource, /createHash\("sha256"\)/);
  assert.match(
    authSource,
    /distributedRateLimit\(\s*`credentials-login-account:\$\{accountKey\}`/,
  );
  assert.doesNotMatch(authSource, /credentials-login-account:\$\{email\}/);

  const ipGate = authSource.indexOf("`credentials-login:${clientAddress}`");
  const accountGate = authSource.indexOf("`credentials-login-account:${accountKey}`");
  assert.ok(ipGate >= 0, "credentials login IP gate must remain present");
  assert.ok(accountGate > ipGate, "account gate must run after the existing IP gate");
});

test("credentials login account gate preserves the existing login rate policy", () => {
  const authSource = read("auth.ts");
  const accountGateStart = authSource.indexOf("`credentials-login-account:${accountKey}`");
  assert.ok(accountGateStart >= 0, "account gate must exist");

  const accountGateSource = authSource.slice(accountGateStart, accountGateStart + 220);
  assert.match(accountGateSource, /limit:\s*10/);
  assert.match(accountGateSource, /windowMs:\s*15 \* 60 \* 1000/);
});

test("missing accounts still execute a cost-12 bcrypt comparison before denial", () => {
  const authSource = read("auth.ts");
  const actionSource = read("app/login/actions.ts");
  const securitySource = read("lib/auth/login-security.ts");

  assert.match(
    securitySource,
    /DUMMY_PASSWORD_HASH\s*=\s*\n?\s*"\$2b\$12\$[./A-Za-z0-9]{53}";/,
  );
  assert.match(
    authSource,
    /user\?\.passwordHash \?\? DUMMY_PASSWORD_HASH/,
  );

  const compareCall = authSource.indexOf("await compare(");
  const unavailableCheck = authSource.indexOf("if (!user || !user.isActive");
  assert.ok(compareCall >= 0, "bcrypt compare must remain present");
  assert.ok(
    unavailableCheck > compareCall,
    "missing-account denial must happen only after the timing-equalizing bcrypt compare",
  );

  assert.match(actionSource, /user\?\.passwordHash \?\? DUMMY_PASSWORD_HASH/);
  const actionCompare = actionSource.indexOf("const passwordMatches = await compare(");
  const actionUnavailable = actionSource.indexOf("if (!user || !user.isActive");
  assert.ok(actionCompare >= 0 && actionUnavailable > actionCompare);
});

test("primary login pre-check has its own hashed distributed account gate", () => {
  const actionSource = read("app/login/actions.ts");

  assert.match(actionSource, /credentials-primary-step-account:\$\{createLoginAccountKey\(email\)\}/);
  assert.doesNotMatch(actionSource, /credentials-primary-step-account:\$\{email\}/);
});

test("login denial observability remains bounded and does not add account identifiers", () => {
  const observabilitySource = read("lib/auth/login-observability.ts");

  assert.doesNotMatch(observabilitySource, /\bemail\b/);
  assert.doesNotMatch(observabilitySource, /\bip\b/);
  assert.doesNotMatch(observabilitySource, /\buserId\b/);
});
