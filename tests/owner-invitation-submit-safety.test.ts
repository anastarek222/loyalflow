import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const read = (file: string) =>
  fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("Owner Invitation submit locks while the server action is pending", () => {
  const form = read("components/owner-invitation-form.tsx");

  assert.match(form, /useFormStatus/);
  assert.match(form, /const \{ pending \} = useFormStatus\(\)/);
  assert.match(form, /disabled=\{pending\}/);
  assert.match(form, /aria-disabled=\{pending\}/);
  assert.match(form, /data-owner-invitation-submit="true"/);
  assert.match(form, /pending \? pendingLabel : label/);
  assert.match(form, /Sending owner invitation\.\.\./);
  assert.match(form, /جارٍ إرسال دعوة المالك\.\.\./);
});
