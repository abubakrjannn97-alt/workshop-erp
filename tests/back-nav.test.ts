import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveBackHref } from "../src/core/shared/back-nav";

describe("resolveBackHref", () => {
  it("returns null on home and more", () => {
    assert.equal(resolveBackHref("/"), null);
    assert.equal(resolveBackHref("/more"), null);
  });

  it("returns home for more-landing pages outside bottom tabs", () => {
    assert.equal(resolveBackHref("/finance"), "/");
    assert.equal(resolveBackHref("/settings"), "/");
    assert.equal(resolveBackHref("/notifications"), "/");
  });

  it("returns null for more-landing pages that are bottom tabs", () => {
    const tabs = new Set(["/", "/orders", "/warehouse", "/finance"]);
    assert.equal(resolveBackHref("/finance", { tabRoots: tabs }), null);
    assert.equal(resolveBackHref("/settings", { tabRoots: tabs }), "/");
    assert.equal(resolveBackHref("/notifications", { tabRoots: tabs }), "/");
    assert.equal(resolveBackHref("/analytics", { tabRoots: tabs }), "/");
    assert.equal(resolveBackHref("/production", { tabRoots: tabs }), "/");
  });

  it("keeps bottom tabs as roots", () => {
    const tabs = new Set(["/", "/crm", "/orders", "/me/commission"]);
    assert.equal(resolveBackHref("/crm", { tabRoots: tabs }), null);
    assert.equal(resolveBackHref("/me/commission", { tabRoots: tabs }), null);
    assert.equal(resolveBackHref("/finance", { tabRoots: tabs }), "/");
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
    assert.equal(resolveBackHref("/me/history"), "/me");
  });

  it("returns settings root for settings subpages", () => {
    assert.equal(resolveBackHref("/settings/roles"), "/settings");
  });
});
