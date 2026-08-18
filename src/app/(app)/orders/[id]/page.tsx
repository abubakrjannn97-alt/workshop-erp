import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { PendingButton } from "@/components/pending-button";
import { IdempotencyField } from "@/components/idempotency-field";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";
import { PAYMENT_METHODS, STATUS_FLOW } from "@core/orders/orders";
import { intlLocale } from "@/lib/i18n";
import { PageHeader } from "@/components/page-header";
import {
  addPayment,
  cancelOrder,
  confirmOrder,
  createPurchaseFromDeficit,
  issueOrderToCustomer,
  reversePayment,
  updateOrderStatus,
} from "@/app/actions/orders";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: true,
      status: true,
      items: { include: { product: { include: { saleUnit: true, outputUnit: true } } } },
      materials: { include: { material: { include: { storageUnit: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      production: true,
    },
  });
  if (!order) notFound();
  if (session.user.roleCode === "sales_manager" && order.sellerId !== session.user.id) {
    redirect("/orders");
  }

  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const canCancel = hasPermission(session.user.permissions, session.user.roleCode, "orders.cancel");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "payments.create");
  const canSeeCost = hasPermission(session.user.permissions, session.user.roleCode, "materials.view");
  const canPurchase = hasPermission(session.user.permissions, session.user.roleCode, "purchasing.manage");
  const canIssue = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const nextCodes = STATUS_FLOW[order.status.code] ?? [];
  const nextStatuses = await prisma.orderStatus.findMany({
    where: { code: { in: nextCodes } },
    orderBy: { sortOrder: "asc" },
  });

  const raw = await findRawWarehouse();
  const stock = raw
    ? await prisma.stockItem.findMany({
        where: { warehouseId: raw.id, materialId: { in: order.materials.map((m) => m.materialId) } },
      })
    : [];
  const stockMap = new Map(stock.map((s) => [s.materialId, s]));
  const deficits = order.materials
    .map((need) => {
      const item = stockMap.get(need.materialId);
      const avail = item ? available(item.qtyOnHand, item.qtyReserved) : D(0);
      const reserved = D(String(need.reservedQty));
      const planned = D(String(need.plannedQty));
      const short = order.confirmedAt
        ? planned.sub(reserved)
        : planned.gt(avail)
          ? planned.sub(avail)
          : D(0);
      return { need, avail, short, reserved };
    })
    .filter((row) => row.short.gt(0));

  const debt = D(String(order.total)).sub(order.paidAmount);
  const margin =
    canSeeCost && order.materialCost ? D(String(order.total)).sub(order.materialCost) : null;

  async function confirmAction(formData: FormData) {
    "use server";
    await confirmOrder(formData);
  }
  async function cancelAction(formData: FormData) {
    "use server";
    await cancelOrder(formData);
  }
  async function statusAction(formData: FormData) {
    "use server";
    await updateOrderStatus(formData);
  }
  async function payAction(formData: FormData) {
    "use server";
    await addPayment(formData);
  }
  async function reverseAction(formData: FormData) {
    "use server";
    await reversePayment(formData);
  }
  async function deficitAction(formData: FormData) {
    "use server";
    const result = await createPurchaseFromDeficit(formData);
    if (result.ok && result.id) redirect(`/purchasing/${result.id}`);
  }
  async function issueAction(formData: FormData) {
    "use server";
    await issueOrderToCustomer(formData);
  }

  return (
    <div className="page-stack">
      <div>
<PageHeader title={`${t("common.order")} № ${order.number}`} />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <Link href={`/crm/customers/${order.customer.id}`} className="font-medium hover:underline">
            {order.customer.name}
          </Link>
          <span className={`st-badge st-${order.status.code === "CANCELLED" ? "bad" : order.status.code === "COMPLETED" || order.status.code === "ISSUED" ? "good" : "info"}`}>
            {n("ostatus", order.status.code, order.status.name)}
          </span>
          <span className={`st-badge st-${order.paymentStatus === "paid" ? "good" : order.paymentStatus === "unpaid" ? "bad" : "warn"}`}>
            {t(`pay.${order.paymentStatus}`)}
          </span>
        </div>
        <p className="mt-2 flex gap-3 text-sm">
          <Link href={`/orders/${order.id}/print?doc=order`} className="text-[var(--titan-dark)] hover:underline">
            {t("common.order")}
          </Link>
          <Link href={`/orders/${order.id}/print?doc=invoice`} className="text-[var(--titan-dark)] hover:underline">
            {t("orders.invoice")}
          </Link>
          <Link href={`/orders/${order.id}/print?doc=receipt`} className="text-[var(--titan-dark)] hover:underline">
            {t("orders.receipt")}
          </Link>
          <Link href={`/orders/${order.id}/print?doc=waybill`} className="text-[var(--titan-dark)] hover:underline">
            {t("orders.waybill")}
          </Link>
          <a href={`/api/export/order?id=${order.id}`} className="text-[var(--titan-dark)] hover:underline">
            CSV
          </a>
          <a href={`/api/export/order?id=${order.id}&format=xls`} className="text-[var(--titan-dark)] hover:underline">
            Excel
          </a>
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Card label={t("common.amount")} value={`${moneyDisplay(order.total)} с`} />
        <Card label={t("common.paid")} value={`${moneyDisplay(order.paidAmount)} с`} />
        <Card label={t("common.debt")} value={`${moneyDisplay(debt)} с`} />
        <Card
          label={t("orders.marginMaterials")}
          value={margin ? `${moneyDisplay(margin)} с` : canSeeCost ? t("orders.noCost") : t("orders.hidden")}
        />
      </div>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("orders.lines")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.product.name}: {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol} →{" "}
                {qtyDisplay(item.outputQty)} {item.product.outputUnit.symbol}
              </span>
              <span className="font-mono text-xs">
                {moneyDisplay(item.unitPrice)} × {qtyDisplay(item.quantity)} = {moneyDisplay(item.amount)} с
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-[var(--muted)]">
          {t("orders.discountNote", { pct: qtyDisplay(order.discountPercent), amt: moneyDisplay(order.discountAmount) })}
        </p>
      </section>

      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("orders.materialsSnap")}</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {order.materials.map((need) => (
            <li key={need.id} className="flex justify-between gap-4">
              <span>
                {need.material.name}: {t("orders.plan")} {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol}, {t("orders.reserved")}{" "}
                {qtyDisplay(need.reservedQty)}
              </span>
              <span className="font-mono text-xs">
                {canSeeCost && need.lineCost ? `${moneyDisplay(need.lineCost)} с` : "—"}
              </span>
            </li>
          ))}
        </ul>
        {!order.canProduceFully && order.confirmedAt ? (
          <p className="mt-3 text-sm text-amber-800">
            {t("orders.cannotProduce", { n: order.number })}
          </p>
        ) : null}
        {deficits.length > 0 ? (
          <div className="mt-3 rounded-lg bg-[var(--warning)]/10 p-3 text-sm">
            <p className="font-medium">{t("orders.shortage")}</p>
            <ul className="mt-1 list-disc pl-5">
              {deficits.map((row) => (
                <li key={row.need.id}>
                  {row.need.material.name} — {qtyDisplay(row.short)} {row.need.material.storageUnit.symbol}
                </li>
              ))}
            </ul>
            {canPurchase ? (
              <form action={deficitAction} className="mt-2">
                <input type="hidden" name="orderId" value={order.id} />
                <button className="text-sm font-medium text-[var(--titan-dark)] hover:underline">
                  {t("orders.createPo")}
                </button>
              </form>
            ) : (
              <Link href="/purchasing" className="mt-2 inline-block text-sm text-[var(--titan-dark)]">
                {t("orders.openPurchasing")}
              </Link>
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card">
          <h2 className="text-sm font-semibold">{t("common.actions")}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT") ? (
              <form action={confirmAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="ui-btn-primary">{t("common.confirm")}</button>
              </form>
            ) : null}
            {canCreate && nextStatuses.length > 0
              ? nextStatuses.map((s) => (
                  <form action={statusAction} key={s.id}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="statusCode" value={s.code} />
                    <button className="ui-btn-secondary">{n("ostatus", s.code, s.name)}</button>
                  </form>
                ))
              : null}
            {canIssue && (order.status.code === "IN_FG" || order.status.code === "READY") ? (
              <form action={issueAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="ui-btn-primary">{t("orders.issueToCustomer")}</button>
              </form>
            ) : null}
            {canCancel && order.status.code !== "CANCELLED" ? (
              <form action={cancelAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="ui-btn-danger">{t("common.cancel")}</button>
              </form>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {t("orders.payrollNote")}
          </p>
        </div>

        <div className="ui-card">
          <h2 className="text-sm font-semibold">{t("orders.payments")}</h2>
          {canPay ? (
            <form action={payAction} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <IdempotencyField prefix={`pay-${order.id}`} />
              <input
                name="amount"
                placeholder={t("common.amount")}
                defaultValue={debt.gt(0) ? moneyDisplay(debt) : ""}
                className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              <select name="method" className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {t(`pay.method.${m.code}`)}
                  </option>
                ))}
              </select>
              <input
                name="comment"
                placeholder={t("common.comment")}
                className="sm:col-span-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              />
              <PendingButton className="ui-btn-primary" pendingLabel={t("common.sending")}>
                {t("orders.acceptPayment")}
              </PendingButton>
            </form>
          ) : null}
          <ul className="mt-3 space-y-2 text-sm">
            {order.payments.length === 0 ? (
              <li className="text-[var(--muted)]">{t("orders.noPayments")}</li>
            ) : (
              order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span>
                    {moneyDisplay(p.amount)} с · {p.method ? t(`pay.method.${p.method}`) : "—"} ·{" "}
                    {p.createdAt.toLocaleString(intlLocale(locale))}
                    {p.reversesId ? ` · ${t("common.reversal")}` : ""}
                  </span>
                  {canPay && !p.reversesId && !order.payments.some((x) => x.reversesId === p.id) ? (
                    <form action={reverseAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <button className="text-xs text-[var(--danger)] hover:underline">{t("wh.revBtn")}</button>
                    </form>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <p className="text-sm">
        <Link href={`/crm/customers/${order.customerId}`} className="text-[var(--titan-dark)] hover:underline">
          {t("orders.customerCard")}
        </Link>
        {order.production ? (
          <>
            {" · "}
            <Link href={`/production/${order.production.id}`} className="text-[var(--titan-dark)] hover:underline">
              {t("page.production")}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="ui-card">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
