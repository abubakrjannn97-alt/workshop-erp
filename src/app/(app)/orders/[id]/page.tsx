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
import { confirmOrderCore } from "@core/orders/confirm-order";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { OrderDetailMetrics } from "../order-detail-metrics";
import { OrderStageProgress } from "../order-stage-progress";
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
  const paidNow = D(String(order.paidAmount));
  const totalNow = D(String(order.total));
  const isFullyPaid = paidNow.gte(totalNow) && paidNow.gt(0);
  if (
    canCreate &&
    isFullyPaid &&
    (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT")
  ) {
    const autoConfirm = await confirmOrderCore(order.id, session.user.id);
    if (autoConfirm.ok) {
      redirect(`/orders/${id}`);
    }
  }

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
  const hasMaterialCost = order.materialCost != null && D(String(order.materialCost)).gte(0);
  const margin =
    canSeeCost && hasMaterialCost ? D(String(order.total)).sub(String(order.materialCost)) : null;
  const noCostHint =
    order.materials.length === 0 || !hasMaterialCost
      ? t("orders.noCostNoRecipe")
      : !order.confirmedAt
        ? t("orders.noCostHint")
        : t("orders.noCostNoRecipe");
  const loc = intlLocale(locale);
  const paymentBlocked = Boolean(payError?.includes("закрыт") || payError?.includes("пӯшида"));
  const hasDiscount = D(String(order.discountPercent)).gt(0);
  const orderDate = order.confirmedAt ?? order.createdAt;
  const orderDateLabel = order.confirmedAt ? t("orders.orderConfirmed") : t("orders.orderReceived");
  const shortDate = orderDate.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });

  const paymentBreakdown =
    debt.lte(0) && paid.gt(0)
      ? [{ label: t("common.paid"), value: t("orders.fullyPaid"), tone: "success" as const }]
      : debt.gt(0) && paid.gt(0)
        ? [
            { label: t("common.paid"), value: `${moneyDisplay(order.paidAmount)} с`, tone: "success" as const },
            { label: t("common.debt"), value: `${moneyDisplay(debt)} с`, tone: "warn" as const },
          ]
        : debt.gt(0)
          ? [{ label: t("common.debt"), value: `${moneyDisplay(debt)} с`, tone: "warn" as const }]
          : [{ label: t("common.payment"), value: t("pay.unpaid"), tone: "muted" as const }];

  const sumTone = debt.gt(0) ? ("warn" as const) : paid.gt(0) && debt.lte(0) ? ("green" as const) : ("gold" as const);
  const sumIcon = debt.gt(0) ? ("warn" as const) : ("gold" as const);

  const metricItems = [
    {
      id: "total",
      label: t("common.amount"),
      value: `${moneyDisplay(order.total)} с`,
      breakdown: paymentBreakdown,
      tone: sumTone,
      icon: sumIcon,
    },
  ];
  if (canSeeCost) {
    metricItems.push({
      id: "margin",
      label: t("orders.profitEstimate"),
      value: margin ? `${moneyDisplay(margin)} с` : "—",
      hint: margin ? undefined : noCostHint,
      tone: "blue" as const,
      icon: "blue" as const,
    });
  }

  const currentStatusName = n("ostatus", order.status.code, order.status.name);

  function statusHint(code: string) {
    const key = `orders.statusHint.${code}` as const;
    const text = t(key);
    return text === key ? t("orders.statusHintDefault") : text;
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
    <div className={`page-stack ${detailStyles.orderDetailPage}`} style={{ gap: "8px" }}>
      <PageHeader
        title={`${t("common.order")} № ${order.number}`}
        description={
          <>
            {order.customer.name}
            <span className={detailStyles.orderDateInline}>
              {" "}
              · {orderDateLabel} {shortDate}
            </span>
          </>
        }
        backHref="/orders"
        backLabel={t("common.back")}
        actions={
          <Link href={`/crm/customers/${order.customer.id}`} className="ui-btn-secondary">
            {t("orders.openCustomer")}
          </Link>
        }
      />

      <OrderDetailMetrics items={metricItems} />

      {canCreate && nextStatuses.length > 0 ? (
        <section className={detailStyles.statusPanel}>
          <div className={detailStyles.statusPanelHead}>
            <h2 className={detailStyles.sectionTitle}>{t("orders.changeStatus")}</h2>
            <StatusBadge label={currentStatusName} tone={orderTone(order.status.code)} />
          </div>
          <OrderStageProgress currentCode={order.status.code} t={t} />
          <p className={detailStyles.statusNextTitle}>{t("orders.nextStep")}</p>
          <ul className={detailStyles.statusOptions}>
            {nextStatuses.map((s, index) => (
              <li key={s.id}>
                <form action={statusAction}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="statusCode" value={s.code} />
                  <button type="submit" className={detailStyles.statusOptionBtn}>
                    <span className={detailStyles.statusOptionRow}>
                      <span className={detailStyles.statusOptionNumber}>{index + 1}</span>
                      <span className={detailStyles.statusOptionText}>
                        <span className={detailStyles.statusOptionLabel}>
                          {n("ostatus", s.code, s.name)}
                        </span>
                        <span className={detailStyles.statusOptionHint}>{statusHint(s.code)}</span>
                      </span>
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
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
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: String(p.amount),
          method: p.method,
          createdAt: p.createdAt.toISOString(),
          reversesId: p.reversesId,
        }))}
        loc={loc}
      />

      <section className={detailStyles.sectionPanel}>
        <h2 className={detailStyles.sectionTitle}>{t("orders.materialsForOrder")}</h2>
        {order.materials.length === 0 ? (
          <p className={detailStyles.sectionNote}>{t("orders.materialsEmpty")}</p>
        ) : (
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
        )}
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

      {(canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT")) ||
      (canIssue && (order.status.code === "IN_FG" || order.status.code === "READY")) ||
      (canCancel && order.status.code !== "CANCELLED") ? (
        <section className={detailStyles.actionsPanel}>
          <h2 className={detailStyles.sectionTitle}>{t("orders.whatToDo")}</h2>
          {canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT") ? (
            <div className={detailStyles.primaryAction}>
              <form action={confirmAction}>
                <input type="hidden" name="id" value={order.id} />
                <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                  {t("orders.confirmOrderBtn")}
                </PendingButton>
              </form>
              <p className={detailStyles.actionHint}>{t("orders.confirmOrderHint")}</p>
            </div>
          ) : null}
          {canIssue && (order.status.code === "IN_FG" || order.status.code === "READY") ? (
            <div className={detailStyles.primaryAction}>
              <form action={issueAction}>
                <input type="hidden" name="id" value={order.id} />
                <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
                  {t("orders.issueToCustomer")}
                </PendingButton>
              </form>
              <p className={detailStyles.actionHint}>{t("orders.issueOrderHint")}</p>
            </div>
          ) : null}
          {canCancel && order.status.code !== "CANCELLED" ? (
            <form action={cancelAction} className={detailStyles.cancelAction}>
              <input type="hidden" name="id" value={order.id} />
              <PendingButton type="submit" className={detailStyles.cancelLink} pendingLabel={t("common.sending")}>
                {t("orders.cancelOrderLink")}
              </PendingButton>
            </form>
          ) : null}
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
