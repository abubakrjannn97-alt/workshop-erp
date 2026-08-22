import Link from "next/link";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { PendingButton } from "@/components/pending-button";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { productLaborRate } from "@core/payroll/labor-rate";
import { available } from "@core/inventory/stock";
import { findFinishedGoodsWarehouse } from "@/core/config/resolve-warehouse";
import { loadPaymentCards } from "@core/config/payment-cards";
import { CustomerStatusPicker } from "@/components/crm/customer-status-picker";
import { isCustomerStatus } from "@core/crm/customer-status";
import { PageHeader } from "@/components/page-header";
import { StatusBadge, orderTone } from "@/components/status-badge";
import { OrderStageProgress } from "../order-stage-progress";
import { OrderPaymentPanel } from "../order-payment-panel";
import { OrderPaymentBreakdown } from "../order-payment-breakdown";
import { OrderPayStepPanel } from "../order-pay-step-panel";
import detailStyles from "../order-detail.module.css";
import listStyles from "../orders.module.css";
import {
  addPayment,
  cancelOrder,
  confirmOrder,
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
  const canManageCrm = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");
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

  const fg = await findFinishedGoodsWarehouse();
  const paymentCards = await loadPaymentCards();
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
  const customerStatus = isCustomerStatus(order.customer.pipelineStatus)
    ? order.customer.pipelineStatus
    : "NEW";

  const hasMaterialCost = order.materialCost != null && D(String(order.materialCost)).gte(0);
  let laborCost = D(0);
  for (const item of order.items) {
    laborCost = laborCost.plus(D(String(item.quantity)).mul(productLaborRate()));
  }
  const costSum = hasMaterialCost
    ? D(String(order.materialCost)).plus(laborCost)
    : laborCost.gt(0)
      ? laborCost
      : D(0);
  const profitSum = D(String(order.total)).sub(costSum);
  const marginOk = profitSum.gte(0);
  const loc = intlLocale(locale);
  const paymentBlocked = Boolean(payError?.includes("закрыт") || payError?.includes("пӯшида"));
  const hasDiscount = D(String(order.discountPercent)).gt(0);
  const orderDate = order.confirmedAt ?? order.createdAt;
  const orderDateLabel = order.confirmedAt ? t("orders.orderConfirmed") : t("orders.orderReceived");
  const shortDate = orderDate.toLocaleDateString(loc, { day: "2-digit", month: "2-digit" });

  const mergedItems = order.items.reduce(
    (acc, item) => {
      const hit = acc.find((row) => row.productId === item.productId && row.unitPrice === String(item.unitPrice));
      if (!hit) {
        acc.push({
          id: item.id,
          productId: item.productId,
          name: item.product.name,
          symbol: item.product.saleUnit.symbol,
          quantity: D(String(item.quantity)),
          unitPrice: D(String(item.unitPrice)),
          amount: D(String(item.amount)),
        });
        return acc;
      }
      hit.quantity = hit.quantity.plus(String(item.quantity));
      hit.amount = hit.amount.plus(String(item.amount));
      return acc;
    },
    [] as {
      id: string;
      productId: string;
      name: string;
      symbol: string;
      quantity: ReturnType<typeof D>;
      unitPrice: ReturnType<typeof D>;
      amount: ReturnType<typeof D>;
    }[],
  );

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
          <div className={detailStyles.orderHeaderActions}>
            {canManageCrm ? (
              <CustomerStatusPicker
                customerId={order.customer.id}
                status={customerStatus}
                locale={locale}
                compact
              />
            ) : null}
            <Link href={`/crm/customers/${order.customer.id}`} className="ui-btn-secondary">
              {t("orders.openCustomer")}
            </Link>
          </div>
        }
      />

      <div className={listStyles.salesKpis}>
        <div className={`${listStyles.salesKpi} ${listStyles.salesKpiSales}`}>
          <p className={listStyles.salesKpiLabel}>{t("orders.kpiSalesSum")}</p>
          <p className={listStyles.salesKpiValue}>{moneyDisplay(order.total)} с</p>
        </div>
        <div className={`${listStyles.salesKpi} ${listStyles.salesKpiCost}`}>
          <p className={listStyles.salesKpiLabel}>{t("orders.kpiCostSum")}</p>
          <p className={listStyles.salesKpiValue}>{canSeeCost ? `${moneyDisplay(costSum)} с` : "—"}</p>
        </div>
        <div
          className={`${listStyles.salesKpi} ${marginOk ? listStyles.salesKpiMargin : listStyles.salesKpiMarginBad}`}
        >
          <p className={listStyles.salesKpiLabel}>{t("orders.kpiMargin")}</p>
          <p className={listStyles.salesKpiValue}>
            {canSeeCost ? `${moneyDisplay(profitSum)} с` : "—"}
          </p>
        </div>
      </div>

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
          {mergedItems.map((item) => (
            <li key={item.id} className={detailStyles.materialRow}>
              <div>
                <p className={detailStyles.materialName}>{item.name}</p>
                <p className={detailStyles.materialQty}>
                  {qtyDisplay(item.quantity)} {item.symbol} × {moneyDisplay(item.unitPrice)} с
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

      <OrderPaymentBreakdown
        locale={locale}
        orderTotal={String(order.total)}
        paidAmount={String(order.paidAmount)}
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: String(p.amount),
          method: p.method,
          comment: p.comment,
          createdAt: p.createdAt.toISOString(),
          reversesId: p.reversesId,
        }))}
        cards={paymentCards}
        loc={loc}
      />

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
        debtDefault={debt.gt(0) ? moneyDisplay(debt) : ""}
        payAction={payAction}
        reverseAction={reverseAction}
        canPay={canPay}
        cards={paymentCards}
        payments={order.payments.map((p) => ({
          id: p.id,
          amount: String(p.amount),
          method: p.method,
          comment: p.comment,
          createdAt: p.createdAt.toISOString(),
          reversesId: p.reversesId,
        }))}
        loc={loc}
      />

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
