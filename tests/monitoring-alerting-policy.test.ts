import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

test("monitoring policy defines safe core health signals and escalation", () => {
  const policy = read("F19_MONITORING_ALERTING_POLICY.md");

  assert.match(policy, /\/api\/health\/live/);
  assert.match(policy, /\/api\/health/);
  assert.match(policy, /readiness/i);
  assert.match(policy, /liveness/i);
  assert.match(policy, /critical/i);
  assert.match(policy, /high/i);
  assert.match(policy, /operational attention/i);
  assert.match(policy, /exact (deployed )?Git SHA/i);
});

test("monitoring policy defines bounded trigger rules for launch-critical failures", () => {
  const policy = read("F19_MONITORING_ALERTING_POLICY.md");

  assert.match(policy, /two consecutive liveness failures/i);
  assert.match(policy, /five continuous minutes of readiness failure/i);
  assert.match(policy, /missing_credentials/);
  assert.match(policy, /backend_unavailable/);
  assert.match(policy, /tenant isolation/i);
  assert.match(policy, /loyalty write correctness/i);
});

test("monitoring policy separates source policy from external provider activation", () => {
  const policy = read("F19_MONITORING_ALERTING_POLICY.md");

  assert.match(policy, /external alert delivery/i);
  assert.match(policy, /provider.*pending/i);
  assert.match(policy, /Owner-designated external channel/i);
  assert.doesNotMatch(policy, /https:\/\/hooks\./i);
  assert.doesNotMatch(policy, /webhook[_ -]?secret/i);
  assert.doesNotMatch(policy, /RESEND_API_KEY|AUTH_SECRET|DATABASE_URL\s*=/);
});

test("incident and release runbooks reference the monitoring policy", () => {
  const incident = read("F19_INCIDENT_RESPONSE_RUNBOOK.md");
  const release = read("F19_PRODUCTION_RELEASE_CHECKLIST.md");

  assert.match(incident, /F19_MONITORING_ALERTING_POLICY\.md/);
  assert.match(release, /F19_MONITORING_ALERTING_POLICY\.md/);
  assert.match(release, /external\s+alert\s+delivery/i);
});
