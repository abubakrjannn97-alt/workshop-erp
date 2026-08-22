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
  it("owner gets home orders warehouse without more tab", () => {
    const tabs = bottomTabsForRole("owner", ROLE_PERMISSIONS.owner);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/", "/orders", "/warehouse"],
    );
    assert.equal(tabs.some((t) => t.isMore), false);
  });

  it("sales manager gets crm orders commission, not finance tab", () => {
    const tabs = bottomTabsForRole("sales_manager", ROLE_PERMISSIONS.sales_manager);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/", "/crm", "/orders", "/me/commission"],
    );
    const more = moreGroupsForRole("sales_manager", ROLE_PERMISSIONS.sales_manager);
    const hrefs = more.flatMap((g) => g.items.map((i) => i.href));
    assert.equal(hrefs.includes("/finance"), false);
    assert.equal(hrefs.includes("/crm"), false);
    assert.equal(hrefs.includes("/orders"), false);
  });

  it("worker gets home and warehouse only", () => {
    const tabs = bottomTabsForRole("worker", ROLE_PERMISSIONS.worker);
    assert.deepEqual(
      tabs.map((t) => t.href),
      ["/me", "/warehouse"],
    );
    assert.equal(tabs.some((t) => t.isMore), false);
    const more = moreGroupsForRole("worker", ROLE_PERMISSIONS.worker);
    assert.equal(more.length, 0);
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

  it("owner more menu lists products and settings, not production", () => {
    const more = moreGroupsForRole("owner", ROLE_PERMISSIONS.owner);
    const hrefs = more.flatMap((g) => g.items.map((i) => i.href));
    assert.ok(hrefs.includes("/products"));
    assert.ok(hrefs.includes("/settings"));
    assert.equal(hrefs.includes("/production"), false);
    assert.equal(hrefs.includes("/orders"), false);
    assert.equal(hrefs.includes("/warehouse"), false);
  });

  it("worker home tab is active on /me", () => {
    const tabs = bottomTabsForRole("worker", ROLE_PERMISSIONS.worker);
    const home = tabs.find((t) => t.id === "worker-home")!;
    assert.equal(isTabActive("/me", home, tabs), true);
  });
});
