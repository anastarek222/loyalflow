import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const setup = source("components/standard-card-setup.tsx");
const renderer = source("components/standard-loyalty-card.tsx");
const cardContract = source("lib/cards/standard-card.ts");
const zPlan = source("docs/FINAL_PRODUCT_Z_PLAN.md");

test("Z3 keeps Arabic and English as presentation variants of one Standard Card config", () => {
  assert.match(
    zPlan,
    /Arabic and English are presentation variants of the same card contract, not separate card configurations\./,
  );
  assert.match(setup, /type CardSetupLanguage = "AR" \| "EN"/);
  assert.match(
    setup,
    /dir=\{language === "AR" \? "rtl" : "ltr"\}/,
  );
  assert.doesNotMatch(
    setup,
    /(?:ar|en)(?:PrimaryColor|ThemePreset|ArtworkCategory|DesignMode)/,
  );
});

test("Z3 language changes never implicitly reset persisted customization state", () => {
  const stateStart = setup.indexOf("const [card, setCard] = useState({");
  const stateEnd = setup.indexOf("const customReadOnly", stateStart);
  assert.ok(stateStart >= 0 && stateEnd > stateStart);
  const stateBlock = setup.slice(stateStart, stateEnd);

  assert.doesNotMatch(stateBlock, /language/);
  assert.match(stateBlock, /initial\.primaryColor/);
  assert.match(stateBlock, /themePreset: initialThemePreset/);
  assert.match(stateBlock, /initial\.artworkEnabled \?\? true/);
  assert.match(stateBlock, /initial\.artworkCategory \|\| "OTHER"/);
  assert.doesNotMatch(setup, /useEffect\([\s\S]*?language[\s\S]*?setCard/);
});

test("Z3 palette and theme authority stays language-agnostic", () => {
  assert.match(
    cardContract,
    /standardCardPresetColor\([\s\S]*?preset:[\s\S]*?themePreset:/,
  );
  assert.doesNotMatch(
    cardContract,
    /standardCardPresetColor\([\s\S]{0,220}?language/,
  );
  assert.match(cardContract, /STANDARD_CARD_THEME_PRESETS/);
  assert.match(cardContract, /STANDARD_CARD_COLOR_PRESETS/);
});

test("Z3 renderer uses one canonical geometry while changing only direction and copy", () => {
  assert.match(renderer, /const language = props\.language \?\? "EN"/);
  assert.match(renderer, /const dir = language === "AR" \? "rtl" : "ltr"/);
  assert.match(renderer, /const rtl = language === "AR"/);
  assert.match(
    renderer,
    /viewBox=\{`0 0 \$\{LOYALTY_CARD_CANVAS\.width\} \$\{LOYALTY_CARD_CANVAS\.height\}`\}/,
  );
  assert.doesNotMatch(renderer, /AR_CARD_CANVAS|EN_CARD_CANVAS/);
});
