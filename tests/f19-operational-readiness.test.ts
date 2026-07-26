import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  deriveOperationalSeverity,
  operationalStatusLabel,
} from "@/lib/operations/platform-status";

const root = process.cwd();

function source(file: string) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

test("F19.5 operational severity is deterministic and does not depend on secrets", () => {
  assert.equal(
    deriveOperationalSeverity({
      totalBusinesses: 10,
      activeBusinesses: 10,
      suspendedBusinesses: 0,
      overdueSubscriptions: 0,
      dueSoonSubscriptions: 2,
      loyaltyActions24h: 50,
    }),
    "healthy",
  );

  assert.equal(
    deriveOperationalSeverity({
      totalBusinesses: 10,
      activeBusinesses: 9,
      suspendedBusinesses: 1,
      overdueSubscriptions: 0,
      dueSoonSubscriptions: 0,
      loyaltyActions24h: 0,
    }),
    "attention",
  );

  assert.equal(
    deriveOperationalSeverity({
      totalBusinesses: 2,
      activeBusinesses: 0,
      suspendedBusinesses: 0,
      overdueSubscriptions: 0,
      dueSoonSubscriptions: 0,
      loyaltyActions24h: 0,
    }),
    "critical",
  );
});

test("F19.5 operational status labels are bilingual", () => {
  assert.equal(operationalStatusLabel("healthy", "EN"), "Healthy");
  assert.equal(operationalStatusLabel("healthy", "AR"), "مستقر");
  assert.equal(operationalStatusLabel("critical", "EN"), "Critical");
  assert.equal(operationalStatusLabel("critical", "AR"), "حرج");
});

test("F19.5 Super Admin operations centre is read-only and protected", () => {
  const page = source("app/operations/page.tsx");

  assert.match(page, /session\.user\.role !== "SUPER_ADMIN"/);
  assert.match(page, /redirect\("\/dashboard"\)/);
  assert.match(page, /Operations centre/);
  assert.match(page, /Platform operations/);
  assert.doesNotMatch(
    page,
    /prisma\.[a-zA-Z]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\(/,
  );
});

test("F19.5 operations centre exposes aggregate platform signals only", () => {
  const page = source("app/operations/page.tsx");

  assert.match(page, /prisma\.business\.count/);
  assert.match(page, /prisma\.business\.groupBy/);
  assert.match(page, /prisma\.loyaltyTransaction\.count/);
  assert.match(page, /derivePaymentState/);
  assert.match(page, /getPublicReleaseMetadata/);
  assert.doesNotMatch(page, /DATABASE_URL|AUTH_SECRET|ipAddress|customerId/);
});

test("F19.5 Super Admin global navigation exposes the operations centre", () => {
  const navigation = source("lib/app-shell-navigation.ts");
  const sidebar = source("components/app-sidebar.tsx");

  assert.match(navigation, /platformOps/);
  assert.match(navigation, /"\/operations"/);
  assert.match(navigation, /Operations centre/);
  assert.match(sidebar, /platformOps:\s*ShieldCheck/);
});

test("F19.5 operational verifier is aggregate-only and read-only", () => {
  const verifier = source("scripts/verify-operational-readiness.ts");

  assert.match(verifier, /prisma\.business\.count/);
  assert.match(verifier, /prisma\.loyaltyTransaction\.count/);
  assert.match(verifier, /deriveOperationalSeverity/);
  assert.match(verifier, /prisma\.\$disconnect/);
  assert.doesNotMatch(
    verifier,
    /prisma\.[a-zA-Z]+\.(create|update|delete|upsert|createMany|updateMany|deleteMany)\(/,
  );
  assert.doesNotMatch(verifier, /DATABASE_URL|AUTH_SECRET/);
});

test("F19.5 incident runbook keeps rollback separate from database history", () => {
  const runbook = source("F19_INCIDENT_RESPONSE_RUNBOOK.md");

  assert.match(runbook, /verify:production-smoke/);
  assert.match(runbook, /verify:operations/);
  assert.match(runbook, /verify:production-db/);
  assert.match(runbook, /application rollback/i);
  assert.match(runbook, /migrate reset/);
  assert.match(runbook, /db push/);
  assert.match(runbook, /tenant isolation/i);
  assert.match(runbook, /loyalty-write incident/i);
});

test("F19.5 backup checklist requires isolated restore validation and target verification", () => {
  const checklist = source("F19_BACKUP_RECOVERY_CHECKLIST.md");
  const release = source("F19_PRODUCTION_RELEASE_CHECKLIST.md");

  assert.match(checklist, /point-in-time\s+recovery/i);
  assert.match(checklist, /isolated database\/branch/i);
  assert.match(checklist, /production database identity/i);
  assert.match(checklist, /migration history/i);
  assert.match(release, /verify:operations/);
  assert.match(release, /F19_INCIDENT_RESPONSE_RUNBOOK\.md/);
});
