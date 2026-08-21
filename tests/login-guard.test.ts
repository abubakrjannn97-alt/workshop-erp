import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  assertLoginAllowed,
  recordLoginFailure,
  recordLoginSuccess,
  resetLoginGuardState,
} from "../src/core/auth/login-guard";

describe("login-guard", () => {
  beforeEach(() => {
    resetLoginGuardState();
  });

  it("does not lock after many failed attempts", async () => {
    const ip = "127.0.0.1";
    const email = "owner@workshop.local";

    for (let i = 0; i < 20; i += 1) {
      await recordLoginFailure(ip, email);
      const check = assertLoginAllowed(ip, email);
      assert.equal(check.ok, true);
    }
  });

  it("allows login after success helper", () => {
    recordLoginSuccess("staff@workshop.local");
    const check = assertLoginAllowed("10.0.0.2", "staff@workshop.local");
    assert.equal(check.ok, true);
  });

  it("does not rate limit by IP", () => {
    const ip = "192.168.1.99";
    for (let i = 0; i < 30; i += 1) {
      const check = assertLoginAllowed(ip, `user${i}@test.local`);
      assert.equal(check.ok, true);
    }
  });
});
