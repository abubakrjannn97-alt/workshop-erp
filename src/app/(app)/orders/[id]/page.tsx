import Link from "next/link";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { PendingButton } from "@/components/pending-button";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "@/core/config/resolve-warehouse";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { OrderDetailMetrics } from "../order-detail-metrics";
import { OrderStageProgress } from "../order-stage-progress";
import { OrderPaymentPanel } from "../order-payment-panel";
import { OrderPayStepPanel } from "../order-pay-step-panel";
import detailStyles from "../order-detail.module.css";
import {
  addPayment,
  cancelOrder,
  confirmOrder,
  createPurchaseFromDeficit,
  issueOrderToCustomer,
  sellOrderFromFgStock,
  reversePayment,
  schedulePayLater,
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

  const code = order.status.code;
  const paid = D(String(order.paidAmount));
  const debt = D(String(order.total)).sub(String(order.paidAmount));
  const paymentDecided =
    code === "AWAITING_PAYMENT" ||
    paid.gt(0) ||
    order.paymentStatus === "paid" ||
    order.paymentStatus === "partial" ||
    order.paymentStatus === "overpaid";
  const showPayStep = canCreate && (code === "NEW" || code === "AWAITING_PAYMENT");
  const showSendToShop = canCreate && (code === "NEW" || code === "AWAITING_PAYMENT") && paymentDecided;
  const showInShop = ["CONFIRMED", "SCHEDULED", "IN_PRODUCTION", "PARTIAL"].includes(code);
  const showReady = canIssue && (code === "READY" || code === "IN_FG");

  const raw = await findRawWarehouse();
  const fg = await findFinishedGoodsWarehouse();
  const fgStock = fg
    ? await prisma.stockItem.findMany({
        where: { warehouseId: fg.id, productId: { in: order.items.map((i) => i.productId) } },
      })
    : [];
  const fgMap = new Map(fgStock.map((s) => [s.productId!, s]));
  const canSellFromFg =
    canIssue &&
    !["ISSUED", "COMPLETED", "CANCELLED"].includes(code) &&
    order.items.length > 0 &&
    order.items.every((item) => {
      const row = fgMap.get(item.productId);
      const avail = row ? available(row.qtyOnHand, row.qtyReserved) : D(0);
      return avail.gte(item.quantity);
    });
  const showWorkflow = showPayStep || showSendToShop || showInShop || showReady || canSellFromFg;
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
  async function payLaterAction(formData: FormData) {
    "use server";
    await schedulePayLater(formData);
  }
  async function issueAction(formData: FormData) {
    "use server";
    await issueOrderToCustomer(formData);
  }
  async function sellFromFgAction(formData: FormData) {
    "use server";
    const result = await sellOrderFromFgStock(formData);
    if (result?.error) {
      redirect(`/orders/${id}?payError=${encodeURIComponent(result.error)}`);
    }
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

      {showWorkflow ? (
        <section className={detailStyles.statusPanel}>
          <div className={detailStyles.statusPanelHead}>
            <h2 className={detailStyles.sectionTitle}>{t("orders.changeStatus")}</h2>
            <StatusBadge label={currentStatusName} tone={orderTone(order.status.code)} />
          </div>
          <OrderStageProgress currentCode={order.status.code} t={t} />

          {showPayStep ? (
            <OrderPayStepPanel
              locale={locale}
              orderId={order.id}
              debtDefault={debt.gt(0) ? moneyDisplay(debt) : moneyDisplay(order.total)}
              payAction={payAction}
              payLaterAction={payLaterAction}
              canPay={canPay}
            />
          ) : null}

          {showSendToShop ? (
            <form action={confirmAction} className={detailStyles.payFormCompact}>
              <input type="hidden" name="id" value={order.id} />
              <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
                {t("orders.sendToShop")}
              </PendingButton>
              <p className={detailStyles.sectionNote}>{t("orders.sendToShopHint")}</p>
            </form>
          ) : null}

          {showInShop ? (
            <div className={detailStyles.workflowInfo}>
              <p className={detailStyles.workflowInfoTitle}>{t("orders.inShopTitle")}</p>
              <p className={detailStyles.sectionNote}>{t("orders.inShopHint")}</p>
              {order.production ? (
                <Link href={`/production/${order.production.id}`} className="ui-btn-secondary min-h-[40px] inline-flex items-center justify-center">
                  {t("orders.openProduction")}
                </Link>
              ) : null}
            </div>
          ) : null}

          {showReady ? (
            <div className={detailStyles.payFormCompact}>
              <p className={detailStyles.workflowInfoTitle}>{t("orders.readyTitle")}</p>
              <p className={detailStyles.sectionNote}>{t("orders.readyHint")}</p>
              <div className={detailStyles.payStepTabs}>
                <form action={issueAction} className={detailStyles.flex1}>
                  <input type="hidden" name="id" value={order.id} />
                  <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
                    {t("orders.issueToCustomer")}
                  </PendingButton>
                </form>
                <form action={statusAction} className={detailStyles.flex1}>
                  <input type="hidden" name="id" value={order.id} />
                  <input type="hidden" name="statusCode" value="RETURN" />
                  <PendingButton className="ui-btn-secondary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
                    {t("orders.markReturn")}
                  </PendingButton>
                </form>
              </div>
            </div>
          ) : null}

          {canSellFromFg && !showReady ? (
            <form action={sellFromFgAction} className={detailStyles.payFormCompact}>
              <input type="hidden" name="id" value={order.id} />
              <PendingButton className="ui-btn-primary min-h-[40px] w-full" pendingLabel={t("common.sending")}>
                {t("orders.sellFromFg")}
              </PendingButton>
              <p className={detailStyles.sectionNote}>{t("orders.sellFromFgHint")}</p>
            </form>
          ) : null}
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

      {canCancel && order.status.code !== "CANCELLED" && order.status.code !== "COMPLETED" && order.status.code !== "ISSUED" ? (
        <form action={cancelAction} className={detailStyles.cancelOnly}>
          <input type="hidden" name="id" value={order.id} />
          <PendingButton type="submit" className={detailStyles.cancelLink} pendingLabel={t("common.sending")}>
            {t("orders.cancelOrderLink")}
          </PendingButton>
        </form>
      ) : null}

      {order.production && !showInShop ? (
        <Link href={`/production/${order.production.id}`} className="ui-btn-secondary min-h-[40px] inline-flex items-center">
          {t("orders.openProduction")}
        </Link>
      ) : null}
    </div>
  );
}
