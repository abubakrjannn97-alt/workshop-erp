import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBackHref } from "../src/core/shared/back-nav";

describe("resolveBackHref", () => {
  it("returns null on main tab roots", () => {
    assert.equal(resolveBackHref("/"), null);
    assert.equal(resolveBackHref("/orders"), null);
    assert.equal(resolveBackHref("/production"), null);
    assert.equal(resolveBackHref("/warehouse"), null);
  });

  it("returns crm root from customer card", () => {
    assert.equal(resolveBackHref("/crm/customers/c1"), "/crm");
  });

  it("returns parent for detail pages", () => {
    assert.equal(resolveBackHref("/orders/abc123"), "/orders");
    assert.equal(resolveBackHref("/production/job-id"), "/production");
  });

  it("returns order detail from print view", () => {
    assert.equal(resolveBackHref("/orders/abc123/print"), "/orders/abc123");
  });

  it("returns section root for nested list pages", () => {
    assert.equal(resolveBackHref("/production/batches"), "/production");
    assert.equal(resolveBackHref("/warehouse/inventory"), "/warehouse");
    assert.equal(resolveBackHref("/orders/new"), "/orders");
  });

  it("returns settings root for settings subpages", () => {
    assert.equal(resolveBackHref("/settings/approvals"), "/settings");
  });
});
