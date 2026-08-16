import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  assertLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  resetLoginGuardState,
} from "../src/lib/login-guard";
import { resetRateLimitState } from "../src/lib/rate-limit";

describe("login-guard", () => {
  beforeEach(() => {
    resetLoginGuardState();
    resetRateLimitState();
  });

  it("blocks after 5 failed attempts for the same account", async () => {
    const ip = "127.0.0.1";
    const email = "owner@workshop.local";

    for (let i = 0; i < 4; i += 1) {
      const check = assertLoginAllowed(ip, email);
      assert.equal(check.ok, true);
      await recordLoginFailure(ip, email);
    }

    await recordLoginFailure(ip, email);
    const blocked = assertLoginAllowed(ip, email);
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.match(blocked.error, /заблокирован/i);
    }
  });

  it("clears lock after successful login", async () => {
    const ip = "10.0.0.2";
    const email = "staff@workshop.local";

    for (let i = 0; i < 5; i += 1) {
      await recordLoginFailure(ip, email);
    }
    recordLoginSuccess(email);
    resetRateLimitState();

    const check = assertLoginAllowed(ip, email);
    assert.equal(check.ok, true);
  });

  it("rate limits by IP", () => {
    const ip = "192.168.1.99";
    for (let i = 0; i < 10; i += 1) {
      const check = assertLoginAllowed(ip, `user${i}@test.local`);
      assert.equal(check.ok, true, `attempt ${i + 1} should pass IP limit`);
    }
    const blocked = assertLoginAllowed(ip, "blocked@test.local");
    assert.equal(blocked.ok, false);
  });
});
