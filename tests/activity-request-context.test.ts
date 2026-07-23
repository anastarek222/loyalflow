import assert from "node:assert/strict";
import test from "node:test";

import {
  getClientIpFromHeaders,
  getDeviceNameFromUserAgent,
  parseActivityRequestContext,
} from "../lib/activity/request-context";

function createHeaders(
  values: Record<string, string>
) {
  return {
    get(name: string) {
      return (
        values[
          name.toLowerCase()
        ] ?? null
      );
    },
  };
}

test("extracts first forwarded client IP", () => {
  const result =
    getClientIpFromHeaders(
      createHeaders({
        "x-forwarded-for":
          "203.0.113.10, 10.0.0.1",
      })
    );

  assert.equal(
    result,
    "203.0.113.10"
  );
});

test("prefers Vercel forwarded client IP", () => {
  const result =
    getClientIpFromHeaders(
      createHeaders({
        "x-vercel-forwarded-for":
          "198.51.100.25",
        "x-forwarded-for":
          "203.0.113.10",
      })
    );

  assert.equal(
    result,
    "198.51.100.25"
  );
});

test("creates readable device labels", () => {
  assert.equal(
    getDeviceNameFromUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1"
    ),
    "iPhone · Safari"
  );

  assert.equal(
    getDeviceNameFromUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) Chrome/140.0.0.0 Safari/537.36"
    ),
    "Mac · Chrome"
  );
});

test("builds activity request context safely", () => {
  assert.deepEqual(
    parseActivityRequestContext(
      createHeaders({
        "x-real-ip":
          "192.0.2.15",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0) Firefox/142.0",
      })
    ),
    {
      ipAddress:
        "192.0.2.15",
      deviceName:
        "Windows · Firefox",
    }
  );
});
