import Link from "next/link";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { PendingButton } from "@/components/pending-button";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";
import { STATUS_FLOW } from "@core/orders/orders";
import { PageHeader } from "@/components/page-header";
import { OrderDetailMetrics } from "../order-detail-metrics";
import { OrderPaymentPanel } from "../order-payment-panel";
import detailStyles from "../order-detail.module.css";
import {
  addPayment,
  cancelOrder,
  confirmOrder,
  createPurchaseFromDeficit,
  issueOrderToCustomer,
  reversePayment,
  updateOrderStatus,
} from "@/app/actions/orders";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payError?: string }>;
}) {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("orders.view");
  const { id } = await params;
  const { payError } = await searchParams;
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

  const debt = D(String(order.total)).sub(String(order.paidAmount));
  const paid = D(String(order.paidAmount));
  const margin =
    canSeeCost && order.materialCost ? D(String(order.total)).sub(String(order.materialCost)) : null;
  const loc = intlLocale(locale);
  const paymentBlocked = Boolean(payError?.includes("закрыт") || payError?.includes("пӯшида"));
  const hasDiscount = D(String(order.discountPercent)).gt(0);
  const orderDate = order.confirmedAt ?? order.createdAt;
  const orderDateLabel = order.confirmedAt ? t("orders.orderConfirmed") : t("orders.orderReceived");
  const shortDate = orderDate.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });

  const paymentHint =
    debt.lte(0) && paid.gt(0)
      ? t("orders.fullyPaid")
      : debt.gt(0) && paid.gt(0)
        ? `${t("common.paid")}: ${moneyDisplay(order.paidAmount)} с · ${t("common.debt")}: ${moneyDisplay(debt)} с`
        : debt.gt(0)
          ? `${t("common.debt")}: ${moneyDisplay(debt)} с`
          : t("pay.unpaid");

  const paymentHintTone = debt.lte(0) && paid.gt(0) ? ("success" as const) : debt.gt(0) ? ("warn" as const) : ("muted" as const);
  const sumTone = debt.gt(0) ? ("warn" as const) : paid.gt(0) && debt.lte(0) ? ("green" as const) : ("gold" as const);
  const sumIcon = debt.gt(0) ? ("warn" as const) : ("gold" as const);

  const metricItems = [
    {
      id: "total",
      label: t("common.amount"),
      value: `${moneyDisplay(order.total)} с`,
      hint: paymentHint,
      hintTone: paymentHintTone,
      tone: sumTone,
      icon: sumIcon,
    },
  ];
  if (canSeeCost) {
    metricItems.push({
      id: "margin",
      label: t("orders.profitEstimate"),
      value: margin ? `${moneyDisplay(margin)} с` : t("orders.noCost"),
      tone: "blue" as const,
      icon: "blue" as const,
    });
  }

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
    const result = await addPayment(formData);
    if (result?.error) {
      redirect(`/orders/${id}?payError=${encodeURIComponent(result.error)}`);
    }
  }
  async function reverseAction(formData: FormData) {
    "use server";
    const result = await reversePayment(formData);
    if (result?.error) {
      redirect(`/orders/${id}?payError=${encodeURIComponent(result.error)}`);
    }
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
    <div className="page-stack" style={{ gap: "12px" }}>
      <PageHeader
        title={`${t("common.order")} № ${order.number}`}
        description={order.customer.name}
        backHref="/orders"
        backLabel={t("common.back")}
        actions={
          <Link href={`/crm/customers/${order.customer.id}`} className="ui-btn-secondary">
            {t("orders.openCustomer")}
          </Link>
        }
      />

      <p className={detailStyles.orderDate}>
        {orderDateLabel} · {shortDate}
      </p>

      <div className={detailStyles.metaRow}>
        <span>
          {t("common.customer")}: <strong>{order.customer.name}</strong>
        </span>
        <span>
          {t("orders.sellerLabel")}: <strong>{order.seller.name}</strong>
        </span>
      </div>

      <OrderDetailMetrics items={metricItems} />

      {canCreate && nextStatuses.length > 0 ? (
        <section className={detailStyles.statusPanel}>
          <h2 className={detailStyles.sectionTitle}>{t("orders.changeStatus")}</h2>
          <p className={detailStyles.sectionHint}>{t("orders.changeStatusHint")}</p>
          <div className={detailStyles.statusActions}>
            {nextStatuses.map((s) => (
              <form action={statusAction} key={s.id}>
                <input type="hidden" name="id" value={order.id} />
                <input type="hidden" name="statusCode" value={s.code} />
                <button type="submit" className="ui-btn-secondary min-h-[44px]">
                  {n("ostatus", s.code, s.name)}
                </button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <section className={detailStyles.sectionPanel}>
        <h2 className={detailStyles.sectionTitle}>{t("orders.lines")}</h2>
        <ul className="ui-list">
          {order.items.map((item) => (
            <li key={item.id} className={detailStyles.materialRow}>
              <div>
                <p className={detailStyles.materialName}>{item.product.name}</p>
                <p className={detailStyles.materialQty}>
                  {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol} × {moneyDisplay(item.unitPrice)} с
                </p>
              </div>
              <strong className="ui-num">{moneyDisplay(item.amount)} с</strong>
            </li>
          ))}
        </ul>
        {hasDiscount ? (
          <p className={detailStyles.sectionNote}>
            {t("orders.discountNote", { pct: qtyDisplay(order.discountPercent), amt: moneyDisplay(order.discountAmount) })}
          </p>
        ) : null}
      </section>

      <section className={detailStyles.sectionPanel}>
        <h2 className={detailStyles.sectionTitle}>{t("orders.materialsForOrder")}</h2>
        <ul className="ui-list">
          {order.materials.map((need) => (
            <li key={need.id} className={detailStyles.materialRow}>
              <div>
                <p className={detailStyles.materialName}>{need.material.name}</p>
                <p className={detailStyles.materialQty}>
                  {t("orders.materialsNeed")}: {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol}
                  {" · "}
                  {t("orders.materialsReserved")}: {qtyDisplay(need.reservedQty)} {need.material.storageUnit.symbol}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {!order.canProduceFully && order.confirmedAt ? (
          <p className={detailStyles.sectionNote}>{t("orders.cannotProduce", { n: String(order.number) })}</p>
        ) : null}
        {deficits.length > 0 ? (
          <div className="mt-2 rounded-lg bg-[var(--warning)]/10 p-3 text-sm">
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
                <button type="submit" className="ui-btn-secondary min-h-[44px]">
                  {t("orders.createPo")}
                </button>
              </form>
            ) : (
              <Link href="/purchasing" className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
                {t("orders.openPurchasing")}
              </Link>
            )}
          </div>
        ) : null}
      </section>

      {payError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          <p>{decodeURIComponent(payError)}</p>
          {paymentBlocked ? (
            <p className="mt-1 text-xs">
              {t("orders.periodClosedHint")}{" "}
              <Link href="/settings/approvals" className="font-medium underline">
                {t("set.approvalsTitle")}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      <OrderPaymentPanel
        locale={locale}
        orderId={order.id}
        customerName={order.customer.name}
        debtDefault={debt.gt(0) ? moneyDisplay(debt) : ""}
        payAction={payAction}
        reverseAction={reverseAction}
        canPay={canPay}
        payments={order.payments}
        loc={loc}
      />

      {(canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT")) ||
      (canIssue && (order.status.code === "IN_FG" || order.status.code === "READY")) ||
      (canCancel && order.status.code !== "CANCELLED") ? (
        <section className={detailStyles.sectionPanel}>
          <h2 className={detailStyles.sectionTitle}>{t("orders.whatToDo")}</h2>
          <ul className={detailStyles.actionList}>
            {canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT") ? (
              <li className={detailStyles.actionItem}>
                <form action={confirmAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                    {t("common.confirm")}
                  </PendingButton>
                </form>
                <p className={detailStyles.actionHint}>{t("orders.confirmOrderHint")}</p>
              </li>
            ) : null}
            {canIssue && (order.status.code === "IN_FG" || order.status.code === "READY") ? (
              <li className={detailStyles.actionItem}>
                <form action={issueAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                    {t("orders.issueToCustomer")}
                  </PendingButton>
                </form>
                <p className={detailStyles.actionHint}>{t("orders.issueOrderHint")}</p>
              </li>
            ) : null}
            {canCancel && order.status.code !== "CANCELLED" ? (
              <li className={detailStyles.actionItem}>
                <form action={cancelAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <PendingButton className="ui-btn-danger min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                    {t("common.cancel")}
                  </PendingButton>
                </form>
                <p className={detailStyles.actionHint}>{t("orders.cancelOrderHint")}</p>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      {order.production ? (
        <Link href={`/production/${order.production.id}`} className="ui-btn-secondary min-h-[44px] inline-flex items-center">
          {t("orders.openProduction")}
        </Link>
      ) : null}
    </div>
  );
}
