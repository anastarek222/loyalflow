import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

test("iOS camera preview keeps the generated scanner video inline and muted", () => {
  const scanner = source("components/qr-scanner.tsx");

  assert.match(scanner, /video\.playsInline = true/);
  assert.match(scanner, /video\.muted = true/);
  assert.match(scanner, /video\.autoplay = true/);
  assert.match(scanner, /video\.setAttribute\("playsinline", ""\)/);
  assert.match(scanner, /video\.setAttribute\("webkit-playsinline", ""\)/);
  assert.match(scanner, /video\.setAttribute\("muted", ""\)/);
  assert.match(scanner, /video\.setAttribute\("autoplay", ""\)/);
});

test("scanner retries inline playback before reporting the camera ready", () => {
  const scanner = source("components/qr-scanner.tsx");
  const compatibilityCall = scanner.indexOf("await ensureInlineCameraPlayback(reader);");
  const readyStatus = scanner.indexOf("setStatus(copy.cameraReady)");

  assert.ok(compatibilityCall > -1);
  assert.ok(readyStatus > compatibilityCall);
  assert.match(scanner, /if \(video\.paused\) await video\.play\(\)\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(scanner, /navigator\.userAgent|iPhone|iPad/);
});
