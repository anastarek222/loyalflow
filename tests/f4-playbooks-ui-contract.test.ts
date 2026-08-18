import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const playbooks = readFileSync(
  new URL("../app/businesses/[slug]/playbooks/page.tsx", import.meta.url),
  "utf8",
);

test("Playbooks uses the final direction-safe semantic workspace", () => {
  assert.match(playbooks, /dir=\{language === "AR" \? "rtl" : "ltr"\}/);
  assert.match(playbooks, /data-playbooks-workspace="true"/);
  assert.match(playbooks, /aria-current=\{isSelected \? "true" : undefined\}/);
  assert.match(playbooks, /bg-surface/);
  assert.match(playbooks, /border-border/);
  assert.match(playbooks, /hover:bg-primary-hover/);
  assert.match(playbooks, /Playbook selection/);
  assert.match(playbooks, /Apply playbook/);
  assert.doesNotMatch(playbooks, /bg-white/);
});

test("Playbooks preserves management, explicit-confirmation, and apply safety boundaries", () => {
  assert.match(playbooks, /canManageBusiness\(session\.user, business\.id\)/);
  assert.match(playbooks, /isBusinessConfiguredForPlaybook\(current\)/);
  assert.match(
    playbooks,
    /applyBusinessPlaybookAction\.bind\(null, business\.slug\)/,
  );
  assert.match(playbooks, /name="playbook" value=\{selected\.id\}/);
  assert.match(playbooks, /name="confirmExisting"/);
  assert.match(playbooks, /required/);
  assert.match(playbooks, /No data will be deleted and no records will be created automatically/);
});
