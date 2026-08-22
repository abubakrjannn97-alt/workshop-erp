import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderListStatusWhere, resolveOrderListBucket } from "../src/core/shared/orders-list-filter";

describe("orders list status buckets", () => {
  it("maps sale buckets", () => {
    assert.equal(resolveOrderListBucket("new"), "new");
    assert.equal(resolveOrderListBucket("delivery"), "delivery");
    assert.equal(resolveOrderListBucket("received"), "received");
    assert.equal(resolveOrderListBucket(undefined), undefined);
    assert.equal(resolveOrderListBucket("all"), undefined);
  });

  it("filters new orders", () => {
    const where = orderListStatusWhere("new");
    assert.deepEqual(where.status.code, { in: ["NEW", "AWAITING_PAYMENT"] });
  });

  it("filters delivery pipeline", () => {
    const where = orderListStatusWhere("delivery");
    assert.ok(where.status.code.in.includes("IN_PRODUCTION"));
    assert.ok(where.status.code.in.includes("READY"));
    assert.ok(!where.status.code.in.includes("ISSUED"));
  });

  it("filters received by client", () => {
    const where = orderListStatusWhere("received");
    assert.deepEqual(where.status.code, { in: ["ISSUED", "COMPLETED"] });
  });
});
