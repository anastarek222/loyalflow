import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("WhatsApp Meta template buttons show immediate pending feedback without dropping submit intent", () => {
  const feedback = readFileSync(
    "components/whatsapp-template-action-feedback.tsx",
    "utf8",
  );
  const layout = readFileSync("app/layout.tsx", "utf8");

  assert.match(feedback, /submit-template/);
  assert.match(feedback, /refresh-template/);
  assert.match(feedback, /document\.addEventListener\("submit"/);
  assert.match(feedback, /whatsappTemplatePending/);
  assert.match(feedback, /aria-busy/);
  assert.match(feedback, /aria-disabled/);
  assert.match(feedback, /whatsapp-template-action__spinner/);
  assert.match(feedback, /Submitting…/);
  assert.match(feedback, /Refreshing…/);
  assert.match(feedback, /جارٍ الإرسال…/);
  assert.match(feedback, /جارٍ التحديث…/);
  assert.match(feedback, /:hover:not/);
  assert.match(feedback, /:active:not/);
  assert.match(feedback, /prefers-reduced-motion/);

  // Do not disable the native submitter during the submit event: its
  // name/value pair carries the server-action intent in the submitted FormData.
  assert.doesNotMatch(feedback, /\.disabled\s*=\s*true/);

  assert.match(
    layout,
    /import \{ WhatsAppTemplateActionFeedback \} from "@\/components\/whatsapp-template-action-feedback";/,
  );
  assert.match(layout, /<WhatsAppTemplateActionFeedback \/>/);
});
