import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { assertSafeProductionEnv, isAuthBypassEnabled } from "../src/lib/env-guard";

describe("env-guard", () => {
  const origNode = process.env.NODE_ENV;
  const origBypass = process.env.AUTH_BYPASS;

  afterEach(() => {
    process.env.NODE_ENV = origNode;
    process.env.AUTH_BYPASS = origBypass;
  });

  it("allows bypass only outside production", () => {
    process.env.NODE_ENV = "development";
    process.env.AUTH_BYPASS = "1";
    assert.equal(isAuthBypassEnabled(), true);

    process.env.NODE_ENV = "production";
    assert.equal(isAuthBypassEnabled(), false);
  });

  it("throws when production has AUTH_BYPASS=1", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_BYPASS = "1";
    assert.throws(() => assertSafeProductionEnv(), /FATAL.*AUTH_BYPASS/);
  });

  it("passes when production without bypass", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_BYPASS = "0";
    assert.doesNotThrow(() => assertSafeProductionEnv());
  });
});
