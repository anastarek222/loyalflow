from pathlib import Path

path = Path("components/business-setup-wizard.tsx")
content = path.read_text()

old_import = 'import { STANDARD_CARD_UNIT_LABEL_MAX_LENGTH } from "@/lib/cards/standard-card-text";\n'
new_import = 'import { UnitLabelInput } from "@/components/unit-label-input";\n'

old_input = '''          <input
            name="unitName"
            required
            defaultValue={copy.defaultUnit}
            maxLength={STANDARD_CARD_UNIT_LABEL_MAX_LENGTH}
            placeholder={copy.unitName}
            className={fieldClass}
          />'''
new_input = '''          <UnitLabelInput
            name="unitName"
            required
            defaultValue={copy.defaultUnit}
            placeholder={copy.unitName}
            className={fieldClass}
          />'''

if content.count(old_import) != 1:
    raise SystemExit(f"expected exactly one old import, found {content.count(old_import)}")
if content.count(old_input) != 1:
    raise SystemExit(f"expected exactly one unitName input, found {content.count(old_input)}")

path.write_text(content.replace(old_import, new_import, 1).replace(old_input, new_input, 1))

Path("tests/unit-label-counter.test.ts").write_text('''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  STANDARD_CARD_UNIT_LABEL_MAX_LENGTH,
  standardCardGraphemeLength,
} from "../lib/cards/standard-card-text";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("unit label authority remains 18 graphemes", () => {
  assert.equal(STANDARD_CARD_UNIT_LABEL_MAX_LENGTH, 18);
  assert.equal(standardCardGraphemeLength("👨‍👩‍👧‍👦"), 1);
});

test("shared unit label input exposes a live x/18 counter", () => {
  const input = source("components/unit-label-input.tsx");
  assert.match(input, /standardCardGraphemeLength/);
  assert.match(input, /data-unit-label-counter/);
  assert.match(input, /\\{count\\}\\/\\{STANDARD_CARD_UNIT_LABEL_MAX_LENGTH\\}/);
});

test("all editable unit-name surfaces consume the shared counter input", () => {
  for (const path of [
    "components/business-setup-wizard.tsx",
    "components/owner-onboarding-wizard.tsx",
    "components/program-rules-form.tsx",
  ]) {
    const content = source(path);
    assert.match(content, /import \\{ UnitLabelInput \\} from "@\\/components\\/unit-label-input"/);
    assert.match(content, /<UnitLabelInput/);
  }
});
''')
