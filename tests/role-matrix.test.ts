import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  canSeeMaterialCost,
  type PermissionCode,
} from "../src/core/rbac/permissions";

const ALL_ROLES = [
  "owner",
  "director",
  "sales_manager",
  "production_manager",
  "worker",
  "warehouse_manager",
  "accountant",
  "employee",
] as const;

function perms(role: string): PermissionCode[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

describe("role permission matrix", () => {
  it("every ROLE_PERMISSIONS entry uses valid permission codes", () => {
    const valid = new Set(Object.keys(PERMISSIONS));
    for (const [role, codes] of Object.entries(ROLE_PERMISSIONS)) {
      for (const code of codes) {
        assert.ok(valid.has(code), `${role} has unknown permission ${code}`);
      }
    }
  });

  it("owner has all permissions via hasPermission", () => {
    for (const code of Object.keys(PERMISSIONS) as PermissionCode[]) {
      assert.equal(hasPermission([], "owner", code), true);
    }
  });

  it("worker cannot create orders or view finance", () => {
    const p = perms("worker");
    assert.equal(hasPermission(p, "worker", "orders.create"), false);
    assert.equal(hasPermission(p, "worker", "finance.view"), false);
    assert.equal(hasPermission(p, "worker", "production.report"), true);
  });

  it("sales_manager cannot view finance, warehouse adjust, or material cost", () => {
    const p = perms("sales_manager");
    assert.equal(hasPermission(p, "sales_manager", "finance.view"), false);
    assert.equal(hasPermission(p, "sales_manager", "inventory.adjust"), false);
    assert.equal(hasPermission(p, "sales_manager", "approvals.decide"), false);
    assert.equal(canSeeMaterialCost(p, "sales_manager"), false);
    assert.equal(hasPermission(p, "sales_manager", "orders.create"), true);
    assert.equal(hasPermission(p, "sales_manager", "payments.create"), true);
  });

  it("production_manager can see recipe cost but not finance", () => {
    const p = perms("production_manager");
    assert.equal(canSeeMaterialCost(p, "production_manager"), true);
    assert.equal(hasPermission(p, "production_manager", "finance.view"), false);
    assert.equal(hasPermission(p, "production_manager", "production.manage"), true);
  });

  it("warehouse_manager can receive purchases but not create orders", () => {
    const p = perms("warehouse_manager");
    assert.equal(hasPermission(p, "warehouse_manager", "purchasing.receive"), true);
    assert.equal(hasPermission(p, "warehouse_manager", "orders.create"), false);
    assert.equal(hasPermission(p, "warehouse_manager", "finance.view"), false);
  });

  it("accountant can view finance and approve salary but not production manage", () => {
    const p = perms("accountant");
    assert.equal(hasPermission(p, "accountant", "finance.view"), true);
    assert.equal(hasPermission(p, "accountant", "salary.approve"), true);
    assert.equal(hasPermission(p, "accountant", "production.manage"), false);
  });

  it("employee role has no default permissions until assigned", () => {
    assert.deepEqual(perms("employee"), []);
    assert.equal(hasPermission([], "employee", "orders.view"), false);
  });

  it("director can decide approvals and manage production", () => {
    const p = perms("director");
    assert.equal(hasPermission(p, "director", "approvals.decide"), true);
    assert.equal(hasPermission(p, "director", "production.manage"), true);
  });
});

describe("role matrix snapshot", () => {
  for (const role of ALL_ROLES) {
    if (role === "owner" || role === "employee") continue;
    it(`${role} has at least one permission in ROLE_PERMISSIONS`, () => {
      assert.ok((ROLE_PERMISSIONS[role]?.length ?? 0) > 0, `${role} is empty`);
    });
  }
});
