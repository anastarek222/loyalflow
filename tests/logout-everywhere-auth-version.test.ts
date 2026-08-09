import assert from "node:assert/strict";
import test from "node:test";

import {
  isCurrentAuthVersion,
  isValidAuthVersion,
} from "@/lib/auth/auth-version";
import {
  logoutEverywhereWithStore,
  type LogoutEverywhereStore,
} from "@/lib/auth/logout-everywhere-core";

test("stale JWT cannot be promoted, recreate a session, or increment authVersion again", async () => {
  let currentAuthVersion = 4;
  const jwt = { authVersion: 4 };
  const updateCalls: number[] = [];

  const sessionBefore = isCurrentAuthVersion(
    jwt.authVersion,
    currentAuthVersion,
  )
    ? { authVersion: jwt.authVersion }
    : null;

  assert.deepEqual(sessionBefore, { authVersion: 4 });

  const store: LogoutEverywhereStore = {
    async incrementAuthVersionIfCurrent(input) {
      updateCalls.push(input.expectedAuthVersion);

      if (input.expectedAuthVersion !== currentAuthVersion) {
        return 0;
      }

      currentAuthVersion += 1;
      return 1;
    },
  };

  const first = await logoutEverywhereWithStore(
    { userId: "session-user", expectedAuthVersion: sessionBefore.authVersion },
    store,
  );

  assert.deepEqual(first, { status: "success" });
  assert.equal(currentAuthVersion, 5);
  assert.equal(jwt.authVersion, 4);

  const sessionAfter = isCurrentAuthVersion(
    jwt.authVersion,
    currentAuthVersion,
  )
    ? { authVersion: jwt.authVersion }
    : null;

  assert.equal(sessionAfter, null);
  assert.equal(jwt.authVersion, 4);

  const repeated = await logoutEverywhereWithStore(
    { userId: "session-user", expectedAuthVersion: jwt.authVersion },
    store,
  );

  assert.deepEqual(repeated, { status: "stale" });
  assert.equal(currentAuthVersion, 5);
  assert.deepEqual(updateCalls, [4, 4]);
});

test("authVersion accepts only non-negative safe integers", () => {
  for (const value of [
    undefined,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    1.5,
    -1,
  ]) {
    assert.equal(isValidAuthVersion(value), false, String(value));
  }

  assert.equal(isValidAuthVersion(0), true);
  assert.equal(isValidAuthVersion(4), true);
  assert.equal(isValidAuthVersion(Number.MAX_SAFE_INTEGER), true);
  assert.equal(isValidAuthVersion(Number.MAX_SAFE_INTEGER + 1), false);
});
