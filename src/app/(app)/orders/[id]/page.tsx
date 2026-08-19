import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { PendingButton } from "@/components/pending-button";
import { IdempotencyField } from "@/components/idempotency-field";
import { FormField } from "@/components/form-field";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { available } from "@core/inventory/stock";
import { findRawWarehouse } from "@/core/config/resolve-warehouse";
import { PAYMENT_METHODS, STATUS_FLOW } from "@core/orders/orders";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { StatusBadge, orderTone, payTone } from "@/components/status-badge";
import { OrderDetailMetrics } from "../order-detail-metrics";
import detailStyles from "../order-detail.module.css";
import {
  DataList,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";
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
  const margin =
    canSeeCost && order.materialCost ? D(String(order.total)).sub(String(order.materialCost)) : null;
  const loc = intlLocale(locale);
  const paymentBlocked = Boolean(payError?.includes("закрыт") || payError?.includes("пӯшида"));

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
    <div className="page-stack">
      <PageHeader
        title={`${t("common.order")} № ${order.number}`}
        description={order.customer.name}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/crm/customers/${order.customer.id}`} className="ui-btn-secondary">
              {t("orders.customerCard")}
            </Link>
            <Link href={`/orders/${order.id}/print?doc=order`} className="ui-btn-secondary">
              {t("common.print")}
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge label={n("ostatus", order.status.code, order.status.name)} tone={orderTone(order.status.code)} />
        <StatusBadge label={t(`pay.${order.paymentStatus}`)} tone={payTone(order.paymentStatus)} />
        <span className="text-xs text-[var(--color-text-muted)]">
          {order.createdAt.toLocaleDateString(loc)}
        </span>
      </div>

      <OrderDetailMetrics
        items={[
          {
            id: "total",
            label: t("common.amount"),
            value: `${moneyDisplay(order.total)} с`,
            tone: "gold",
            icon: "gold",
          },
          {
            id: "paid",
            label: t("common.paid"),
            value: `${moneyDisplay(order.paidAmount)} с`,
            tone: "green",
            icon: "green",
          },
          {
            id: "debt",
            label: t("common.debt"),
            value: `${moneyDisplay(debt)} с`,
            hint: debt.gt(0) ? t("orders.attention") : undefined,
            tone: "warn",
            icon: "warn",
          },
          {
            id: "margin",
            label: t("orders.marginMaterials"),
            value: margin ? `${moneyDisplay(margin)} с` : canSeeCost ? t("orders.noCost") : t("orders.hidden"),
            tone: "blue",
            icon: "blue",
          },
        ]}
      />

      {canCreate && nextStatuses.length > 0 ? (
        <section className={detailStyles.statusPanel}>
          <h2 className={detailStyles.statusPanelTitle}>{t("common.status")}</h2>
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

      <DataTableSection>
        <h2 className="border-b border-[var(--border-soft)] px-3 py-2 text-sm font-semibold">{t("orders.lines")}</h2>
        <DataList layout="cols3">
          <DataListHead layout="cols3">
            <DataListHeadCell>{t("common.product")}</DataListHeadCell>
            <DataListHeadCell align="right">{t("common.qty")}</DataListHeadCell>
            <DataListHeadCell align="right">{t("common.amount")}</DataListHeadCell>
          </DataListHead>
          <ul className={dataListStyles.rows}>
            {order.items.map((item) => (
              <DataListRow key={item.id} layout="cols3">
                <DataListPrimary
                  title={item.product.name}
                  subtitle={`${qtyDisplay(item.quantity)} ${item.product.saleUnit.symbol} → ${qtyDisplay(item.outputQty)} ${item.product.outputUnit.symbol}`}
                />
                <DataListMetric
                  label={t("common.qty")}
                  value={`${moneyDisplay(item.unitPrice)} × ${qtyDisplay(item.quantity)}`}
                />
                <DataListMetric label={t("common.amount")} value={`${moneyDisplay(item.amount)} с`} />
              </DataListRow>
            ))}
          </ul>
        </DataList>
        <p className="border-t border-[var(--border-soft)] px-3 py-2 text-xs text-[var(--muted)]">
          {t("orders.discountNote", { pct: qtyDisplay(order.discountPercent), amt: moneyDisplay(order.discountAmount) })}
        </p>
      </DataTableSection>

      <DashPanel title={t("orders.materialsSnap")} icon={ClipboardList}>
        <ul className="ui-list">
          {order.materials.map((need) => (
            <li key={need.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-4 text-sm">
              <span>
                {need.material.name}: {t("orders.plan")} {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol},{" "}
                {t("orders.reserved")} {qtyDisplay(need.reservedQty)}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums">
                {canSeeCost && need.lineCost ? `${moneyDisplay(need.lineCost)} с` : "—"}
              </span>
            </li>
          ))}
        </ul>
        {!order.canProduceFully && order.confirmedAt ? (
          <p className="mt-3 text-sm text-amber-800">{t("orders.cannotProduce", { n: String(order.number) })}</p>
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
      </DashPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashPanel title={t("common.actions")}>
          <div className="flex flex-wrap gap-2">
            {canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT") ? (
              <form action={confirmAction}>
                <input type="hidden" name="id" value={order.id} />
                <button type="submit" className="ui-btn-primary min-h-[44px]">
                  {t("common.confirm")}
                </button>
              </form>
            ) : null}
            {canIssue && (order.status.code === "IN_FG" || order.status.code === "READY") ? (
              <form action={issueAction}>
                <input type="hidden" name="id" value={order.id} />
                <button type="submit" className="ui-btn-primary min-h-[44px]">
                  {t("orders.issueToCustomer")}
                </button>
              </form>
            ) : null}
            {canCancel && order.status.code !== "CANCELLED" ? (
              <form action={cancelAction}>
                <input type="hidden" name="id" value={order.id} />
                <button type="submit" className="ui-btn-danger min-h-[44px]">
                  {t("common.cancel")}
                </button>
              </form>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{t("orders.payrollNote")}</p>
        </DashPanel>

        <DashPanel title={t("orders.payments")}>
          {payError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
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
          {canPay ? (
            <form action={payAction} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <IdempotencyField prefix={`pay-${order.id}`} />
              <FormField label={t("common.amount")} className="sm:col-span-2">
                <input
                  name="amount"
                  defaultValue={debt.gt(0) ? moneyDisplay(debt) : ""}
                  className="ui-input"
                  inputMode="decimal"
                />
              </FormField>
              <FormField label={t("common.method")}>
                <select name="method" className="ui-input">
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.code} value={m.code}>
                      {t(`pay.method.${m.code}`)}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={t("common.comment")} className="sm:col-span-2">
                <input name="comment" className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2" pendingLabel={t("common.sending")}>
                {t("orders.acceptPayment")}
              </PendingButton>
            </form>
          ) : null}
          <ul className="ui-list mt-3">
            {order.payments.length === 0 ? (
              <li className="py-2 text-sm text-[var(--muted)]">{t("orders.noPayments")}</li>
            ) : (
              order.payments.map((p) => (
                <li key={p.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-3 text-sm">
                  <span>
                    {moneyDisplay(p.amount)} с · {p.method ? t(`pay.method.${p.method}`) : "—"} ·{" "}
                    {p.createdAt.toLocaleString(loc)}
                    {p.reversesId ? ` · ${t("common.reversal")}` : ""}
                  </span>
                  {canPay && !p.reversesId && !order.payments.some((x) => x.reversesId === p.id) ? (
                    <form action={reverseAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <button type="submit" className="min-h-[44px] text-xs text-[var(--danger)] hover:underline">
                        {t("wh.revBtn")}
                      </button>
                    </form>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </DashPanel>
      </div>

      {order.production ? (
        <p className="text-sm">
          <Link href={`/production/${order.production.id}`} className="text-[var(--titan-dark)] hover:underline">
            {t("page.production")} →
          </Link>
        </p>
      ) : null}
    </div>
  );
}
