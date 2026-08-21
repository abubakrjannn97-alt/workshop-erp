import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBackHref } from "../src/core/shared/back-nav";

describe("resolveBackHref", () => {
  it("returns null on home and more", () => {
    assert.equal(resolveBackHref("/"), null);
    assert.equal(resolveBackHref("/more"), null);
  });

  it("returns null on desktop for more-landing roots", () => {
    assert.equal(resolveBackHref("/finance"), null);
    assert.equal(resolveBackHref("/settings"), null);
    assert.equal(resolveBackHref("/notifications"), null);
  });

  it("returns /more on mobile for more-landing roots", () => {
    const tabs = new Set(["/", "/orders", "/warehouse", "/more"]);
    assert.equal(resolveBackHref("/finance", { tabRoots: tabs }), "/more");
    assert.equal(resolveBackHref("/settings", { tabRoots: tabs }), "/more");
    assert.equal(resolveBackHref("/notifications", { tabRoots: tabs }), "/more");
    assert.equal(resolveBackHref("/analytics", { tabRoots: tabs }), "/more");
    assert.equal(resolveBackHref("/production", { tabRoots: tabs }), "/more");
  });

  it("keeps bottom tabs as roots on mobile", () => {
    const tabs = new Set(["/", "/crm", "/orders", "/me/commission", "/more"]);
    assert.equal(resolveBackHref("/crm", { tabRoots: tabs }), null);
    assert.equal(resolveBackHref("/me/commission", { tabRoots: tabs }), null);
    assert.equal(resolveBackHref("/finance", { tabRoots: tabs }), "/more");
  });

  it("returns crm root from customer card", () => {
    assert.equal(resolveBackHref("/crm/customers/c1"), "/crm");
  });

  it("returns parent for detail pages", () => {
    assert.equal(resolveBackHref("/orders/abc123"), "/orders");
    assert.equal(resolveBackHref("/production/job-id"), "/production");
    assert.equal(resolveBackHref("/finance/expenses"), "/finance");
    assert.equal(resolveBackHref("/production/batches"), "/production");
    assert.equal(resolveBackHref("/settings/users"), "/settings");
    assert.equal(resolveBackHref("/warehouse/add"), "/warehouse");
    assert.equal(resolveBackHref("/materials/new"), "/materials");
  });

  it("returns order detail from print view", () => {
    assert.equal(resolveBackHref("/orders/abc123/print"), "/orders/abc123");
  });

  it("returns section root for nested list pages", () => {
    assert.equal(resolveBackHref("/warehouse/inventory"), "/warehouse");
    assert.equal(resolveBackHref("/orders/new"), "/orders");
  });

  it("returns settings root for settings subpages", () => {
    assert.equal(resolveBackHref("/settings/approvals"), "/settings");
    assert.equal(resolveBackHref("/settings/audit"), "/settings");
  });
});
