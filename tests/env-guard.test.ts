import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { assertSafeProductionEnv, isAuthBypassEnabled } from "../src/core/shared/env-guard";

describe("env-guard", () => {
  const origNode = process.env.NODE_ENV;
  const origBypass = process.env.AUTH_BYPASS;
  const origSecret = process.env.AUTH_SECRET;
  const origDb = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.NODE_ENV = origNode;
    process.env.AUTH_BYPASS = origBypass;
    process.env.AUTH_SECRET = origSecret;
    process.env.DATABASE_URL = origDb;
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
    process.env.AUTH_SECRET = "x".repeat(32);
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    assert.doesNotThrow(() => assertSafeProductionEnv());
  });

  it("throws when production AUTH_SECRET is missing/short", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_BYPASS = "0";
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/db";
    delete process.env.AUTH_SECRET;
    assert.throws(() => assertSafeProductionEnv(), /AUTH_SECRET/);
    process.env.AUTH_SECRET = "short";
    assert.throws(() => assertSafeProductionEnv(), /AUTH_SECRET/);
  });

  it("throws when production DATABASE_URL is missing", () => {
    process.env.NODE_ENV = "production";
    process.env.AUTH_BYPASS = "0";
    process.env.AUTH_SECRET = "x".repeat(32);
    delete process.env.DATABASE_URL;
    assert.throws(() => assertSafeProductionEnv(), /DATABASE_URL/);
  });
});
