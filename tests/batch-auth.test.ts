import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertCanCloseBatch, isProductionScopedWorker } from "../src/core/production/batch-auth";
import { ROLE_PERMISSIONS, canSeeMaterialCost } from "../src/core/rbac/permissions";

describe("worker batch authorization", () => {
  it("worker cannot close another worker's batch", () => {
    const result = assertCanCloseBatch({
      roleCode: "worker",
      userId: "w1",
      permissions: ROLE_PERMISSIONS.worker,
      responsibleUserId: "w2",
    });
    assert.equal(result.ok, false);
  });

  it("worker can close own assigned batch", () => {
    const result = assertCanCloseBatch({
      roleCode: "worker",
      userId: "w1",
      permissions: ROLE_PERMISSIONS.worker,
      responsibleUserId: "w1",
    });
    assert.equal(result.ok, true);
  });

  it("production manager can close any batch", () => {
    const result = assertCanCloseBatch({
      roleCode: "production_manager",
      userId: "pm",
      permissions: ROLE_PERMISSIONS.production_manager,
      responsibleUserId: "w1",
    });
    assert.equal(result.ok, true);
  });

  it("worker is scoped", () => {
    assert.equal(isProductionScopedWorker("worker", ROLE_PERMISSIONS.worker), true);
    assert.equal(isProductionScopedWorker("production_manager", ROLE_PERMISSIONS.production_manager), false);
  });
});

describe("sales manager cost visibility", () => {
  it("sales_manager cannot see material/purchase cost", () => {
    assert.equal(canSeeMaterialCost(ROLE_PERMISSIONS.sales_manager, "sales_manager"), false);
  });

  it("production_manager can see recipe cost", () => {
    assert.equal(canSeeMaterialCost(ROLE_PERMISSIONS.production_manager, "production_manager"), true);
  });
});
