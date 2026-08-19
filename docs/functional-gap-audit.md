# Functional Gap Audit v2.0

**Date:** 2026-08-19  
**Baseline:** npm test 78/78 PASS · npm run build PASS · npm run e2e 42/42 PASS

---

## Current System Coverage

### Fully Implemented & Tested (E2E)

| Area | What Works |
|------|------------|
| **Orders** | Create (single product), confirm (reserves materials, creates ProductionOrder), cancel (+approval if paid), status transitions (12 states with flow enforcement), payment (cash/bank/card), payment reversal (+approval), commission accrual, issue FG to customer, complete |
| **Production** | Auto-creation on order confirm, batch creation with material scaling, worker assignment/scoping, batch closure (material write-off, FG receipt, scrap, wage accrual, reserve release), stage assignment, overuse/scrap notifications |
| **Warehouse** | Material receipt (WAC), product receipt (WAC), reserve (full/partial), release, write-off (+approval), transfer, inventory count/confirm/adjust, movement reversal, negative stock prevention, period-open assertion, idempotency on all ops |
| **Finance** | CASH/BANK accounts, 5 financial funds (Materials/Labor/Commission/OPEX/Profit), client payment → fund allocation, expenses with categories, cash transfer (+approval), obligations (one-time + MONTHLY recurring), cash shift open/close with shortage detection, ledger idempotency, period closure |
| **Purchasing** | Create PO (manual + from deficit), confirm, receive (stock + price history update), payment → ledger, cancel |
| **Payroll** | Commission accrual (PROGRESSIVE/TIERED), production wage accrual, payout (validates debt), payout → ledger |
| **CRM** | Customer CRUD, lead creation/stages, lead → order conversion, pipeline |
| **Approvals** | DISCOUNT, WRITE_OFF, TRANSFER, INVENTORY, CANCEL_PAID, CASH_SHORTAGE, RECIPE, REFUND — all with proper decision flow |
| **Auth/RBAC** | 43 permissions, 7 roles, live refresh, worker scope, permission checks on every action/page |
| **Audit** | Every significant operation creates audit log entry |

---

## GAP TABLE

### P0 — Critical (data integrity / business-breaking)

*None found.*

The system has comprehensive idempotency, transaction rollback, negative stock prevention, period locks, and status flow enforcement.

---

### P1 — Major (real workflow cannot be completed)

*None found.*

All core workflows (order → production → FG → issue → complete; purchase → receive → stock; payment → fund allocation → payroll) are fully operational end-to-end.

---

### P2 — Moderate (workflow works but important capability missing)

#### G2-1: Purchase Payment Hardcoded to CASH

**What works:** `registerPurchasePayment` correctly creates ledger entries (CASH_OUT + FUND_OUT for MATERIALS).

**What's missing:** Payment method is hardcoded to `accountByCode(tx, "CASH")`. Suppliers paid via bank transfer are incorrectly recorded as cash expenditure.

**Criticality:** P2 — Financial reports will misattribute supplier payments between cash and bank.

**Files affected:**
- `src/app/actions/purchasing.ts` (line 198)
- `src/app/(app)/purchasing/[id]/page.tsx` (add method selector to payment form)

**How to verify:** Create PO → receive → pay with "bank" → check ledger shows BANK account.

**E2E scenario:** `purchasing_payment_bank` — register PO payment with method=bank, verify ledger entry uses BANK account.

---

#### G2-2: No Auto-Transition When Order Fully Paid

**What works:** `addPayment` correctly updates `paymentStatus` (unpaid/partial/paid/overpaid). Order status flow has NEW → AWAITING_PAYMENT → ON_HOLD.

**What's missing:** When an order reaches `paymentStatus: "paid"`, the order status does not automatically advance. The STATUS_FLOW allows `AWAITING_PAYMENT → ON_HOLD` but NOT `AWAITING_PAYMENT → CONFIRMED`. A sales manager must manually trigger confirmation after payment.

**Criticality:** P2 — Slows down workflow; fully-paid orders sit in AWAITING_PAYMENT until someone manually confirms.

**Files affected:**
- `src/app/actions/orders.ts` (`addPayment` — add auto-confirm logic after payment makes order fully paid)
- `src/core/orders/orders.ts` (STATUS_FLOW: add AWAITING_PAYMENT → CONFIRMED)

**How to verify:** Create order → move to AWAITING_PAYMENT → pay full amount → order should auto-confirm (or at least allow manual confirm from AWAITING_PAYMENT state).

**E2E scenario:** `order_auto_confirm_on_full_payment` — create order, move to AWAITING_PAYMENT, add full payment, verify order transitions to CONFIRMED.

---

#### G2-3: Single-Product Order Creation

**What works:** `createOrder` creates an order with one product + proper quote/material calculation. Multi-product is supported in schema (OrderItem has many-to-one relation).

**What's missing:** The create order form and action only accept a single `productId/quantity/unitPrice`. Real workshops often have multi-product orders (e.g., 3 types of tiles for one client).

**Criticality:** P2 — Workaround exists: create multiple separate orders for the same customer. But this fragments the workflow and makes commission/delivery tracking harder.

**Files affected:**
- `src/app/actions/orders.ts` (`createOrder` — accept array of items)
- `src/app/(app)/orders/page.tsx` or order creation UI (multi-item form)
- `src/core/orders/orders.ts` (`mergeMaterialNeeds` already supports multi-quote)

**How to verify:** Create order with 2 products → confirm → verify both items reserved → production order covers both.

**E2E scenario:** `order_multi_product` — create order with 2 products, confirm, verify material reservations and production order.

---

### P3 — Minor (convenience / reporting)

#### G3-1: Partial Purchase Order Receipt

**What works:** `receivePurchaseOrder` receives all items in full.

**What's missing:** No way to receive partial quantities per item (e.g., supplier delivers 80% of order). `receivedQty` is set to full `item.quantity`.

**Files affected:** `src/app/actions/purchasing.ts` (`receivePurchaseOrder`)

**How to verify:** Receive PO with custom quantities per item.

**E2E scenario:** `purchase_partial_receipt`

---

#### G3-2: No Customer Archive

**What works:** Customer creation and editing.

**What's missing:** No `archiveCustomer` action (only employee archive exists). Inactive customers accumulate without cleanup.

**Files affected:** `src/app/actions/customers.ts`, Customer model (already has no `archivedAt` — schema change needed if implemented)

**How to verify:** Archive customer → verify they don't appear in active lists but orders remain.

**E2E scenario:** `customer_archive`

---

#### G3-3: No Automated Low-Stock Purchase Suggestions

**What works:** `src/core/inventory/alerts.ts` provides query data for UI display of low stock. Analytics page shows "materials to purchase" section.

**What's missing:** No proactive notification when stock drops below minimum. No automatic PO draft creation.

**Files affected:** `src/core/inventory/alerts.ts`, notification system

**How to verify:** Stock drops below min → notification sent to warehouse_manager.

**E2E scenario:** `low_stock_notification`

---

#### G3-4: No Due Date Reminders / Overdue Notifications

**What works:** Orders have `dueAt` field. Analytics/Sales pages show overdue orders.

**What's missing:** No proactive notification when an order becomes overdue. Sales manager must manually check.

**Files affected:** Would need a cron/scheduled job or check on page load.

**How to verify:** Order passes due date → notification to seller.

**E2E scenario:** `overdue_order_notification`

---

#### G3-5: Cash Shift Doesn't Track Individual Transactions

**What works:** `closeCashShift` calculates expected amount from ALL ledger entries since shift opened.

**What's missing:** Cash shift doesn't have a dedicated list of "transactions during this shift" — it queries all entries by date range. This works but makes shift reports less precise.

**Files affected:** Display only (query refinement in finance page).

**How to verify:** Visual — shift report shows only shift-period transactions.

**E2E scenario:** Not needed — display issue.

---

## Summary

| Priority | Count | Items |
|----------|-------|-------|
| **P0 Critical** | 0 | — |
| **P1 Major** | 0 | — |
| **P2 Moderate** | 3 | G2-1, G2-2, G2-3 |
| **P3 Minor** | 5 | G3-1 through G3-5 |

---

## Recommended Implementation Order

### Phase 1 (P2 — immediate value)

1. **G2-2** — Allow AWAITING_PAYMENT → CONFIRMED transition (simplest: 1 line in STATUS_FLOW + optional auto-confirm in addPayment)
2. **G2-1** — Add payment method to PO payment form (small change: add `method` field, use `accountForMethod()`)
3. **G2-3** — Multi-product order creation (most complex: form + action refactor, but backend already supports it via schema)

### Phase 2 (P3 — polish)

4. G3-1 — Partial PO receipt
5. G3-2 — Customer archive
6. G3-3 — Low-stock notifications
7. G3-4 — Overdue notifications

### Not recommended to implement:

- G3-5 — Cash shift transaction tracking (display refinement, not a gap)

---

## Notes

- No Prisma schema changes needed for P2 gaps (schema already supports multi-product orders, PO partial receipt field exists)
- G2-2 may intentionally exist as "manual confirmation required" business rule — **confirm with stakeholder**
- All existing E2E tests (42/42) must continue passing after any changes
- No design/UI changes beyond adding form fields where needed
