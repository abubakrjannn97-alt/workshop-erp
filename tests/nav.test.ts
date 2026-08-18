import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ROLE_PERMISSIONS } from "../src/core/rbac/permissions";
import {
  bottomTabsForRole,
  isTabActive,
  moreGroupsForRole,
  tabHrefSet,
} from "../src/core/shared/nav";

describe("mobile nav by role", () => {
  it("owner gets home orders production warehouse more", () => {
    const tabs = bottomTabsForRole("owner", ROLE_PERMISSIONS.owner);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/", "/orders", "/production", "/warehouse", "/more"],
    );
  });

  it("sales manager gets crm orders commission, not finance tab", () => {
    const tabs = bottomTabsForRole("sales_manager", ROLE_PERMISSIONS.sales_manager);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/", "/crm", "/orders", "/me/commission", "/more"],
    );
    const more = moreGroupsForRole("sales_manager", ROLE_PERMISSIONS.sales_manager);
    const hrefs = more.flatMap((g) => g.items.map((i) => i.href));
    assert.equal(hrefs.includes("/finance"), false);
    assert.equal(hrefs.includes("/crm"), false);
    assert.equal(hrefs.includes("/orders"), false);
  });

  it("worker has no dashboard and no more tab", () => {
    const tabs = bottomTabsForRole("worker", ROLE_PERMISSIONS.worker);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/me", "/me/history", "/me/profile"],
    );
    assert.equal(tabs.some((t) => t.isMore), false);
  });

  it("warehouse manager does not get a finance tab", () => {
    const tabs = bottomTabsForRole("warehouse_manager", ROLE_PERMISSIONS.warehouse_manager);
    assert.equal(tabs.some((t) => t.href === "/finance"), false);
    assert.ok(tabHrefSet(tabs).has("/warehouse"));
    assert.ok(tabHrefSet(tabs).has("/warehouse/inventory"));
  });

  it("picks the longest matching tab so inventory is not warehouse", () => {
    const tabs = bottomTabsForRole("warehouse_manager", ROLE_PERMISSIONS.warehouse_manager);
    const warehouse = tabs.find((t) => t.id === "warehouse")!;
    const inventory = tabs.find((t) => t.id === "inventory")!;
    assert.equal(isTabActive("/warehouse/inventory", inventory, tabs), true);
    assert.equal(isTabActive("/warehouse/inventory", warehouse, tabs), false);
    assert.equal(isTabActive("/warehouse", warehouse, tabs), true);
  });

  it("more is active only when no other tab matches", () => {
    const tabs = bottomTabsForRole("owner", ROLE_PERMISSIONS.owner);
    const more = tabs.find((t) => t.isMore)!;
    assert.equal(isTabActive("/settings", more, tabs), true);
    assert.equal(isTabActive("/orders/abc", more, tabs), false);
  });
});
