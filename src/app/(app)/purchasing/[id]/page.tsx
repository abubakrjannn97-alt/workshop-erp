import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { DataTableSection, UiTable } from "@/components/data-table";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  registerPurchasePayment,
} from "@/app/actions/purchasing";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED_FULL"),
    POSTED: t("po.POSTED"),
    CANCELLED: t("po.CANCELLED"),
  };
  return map[s] ?? s;
}

function poTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  if (status === "CANCELLED") return "bad";
  if (status === "ORDERED") return "info";
  if (status === "REQUEST") return "warn";
  return "neutral";
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslator();
  const { id } = await params;
  const session = await requirePermission("purchasing.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.receive");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { material: { include: { storageUnit: true } } } }, payments: true },
  });
  if (!order) notFound();
  const debt = D(String(order.total)).sub(order.paidAmount);

  return (
    <div className="page-stack">
      <PageHeader
        title={order.number}
        description={order.supplier.name}
        meta={<StatusBadge label={poStatus(t, order.status) ?? order.status} tone={poTone(order.status)} />}
        actions={
          <Link href={`/purchasing/${order.id}/print`} className="ui-btn-secondary">
            {t("po.printWaybill")}
          </Link>
        }
      />

      <DataTableSection>
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("common.material")}</th>
                <th className="px-4 py-3 text-right">{t("common.qty")}</th>
                <th className="px-4 py-3 text-right">{t("common.price")}</th>
                <th className="px-4 py-3 text-right">{t("common.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3" data-label={t("common.material")}>{item.material.name}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.qty")}>
                    {qtyDisplay(item.quantity)} {item.material.storageUnit.symbol}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.price")}>
                    {moneyDisplay(item.unitPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.amount")}>
                    {moneyDisplay(item.amount)} с
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </UiTable>
      </DataTableSection>

      <p className="text-sm">
        {t("po.summary", { total: moneyDisplay(order.total), paid: moneyDisplay(order.paidAmount), debt: moneyDisplay(debt) })}
      </p>

      {(canManage && order.status === "REQUEST") ||
      (canReceive && (order.status === "ORDERED" || order.status === "REQUEST")) ||
      (canManage && order.status !== "POSTED" && order.status !== "CANCELLED") ? (
        <DashPanel title={t("common.actions")}>
          <div className="flex flex-wrap gap-2">
            {canManage && order.status === "REQUEST" ? (
              <form action={confirmPurchaseOrder}>
                <input type="hidden" name="id" value={order.id} />
                <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                  {t("po.confirmToSupplier")}
                </PendingButton>
              </form>
            ) : null}
            {canReceive && (order.status === "ORDERED" || order.status === "REQUEST") ? (
              <form action={receivePurchaseOrder}>
                <input type="hidden" name="id" value={order.id} />
                <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                  {t("po.acceptPost")}
                </PendingButton>
              </form>
            ) : null}
            {canManage && order.status !== "POSTED" && order.status !== "CANCELLED" ? (
              <form action={cancelPurchaseOrder}>
                <input type="hidden" name="id" value={order.id} />
                <PendingButton className="min-h-[44px] text-sm text-[var(--danger)]" pendingLabel={t("common.sending")}>
                  {t("common.cancel")}
                </PendingButton>
              </form>
            ) : null}
          </div>
        </DashPanel>
      ) : null}

      {canManage && order.status !== "CANCELLED" ? (
        <DashPanel title={t("common.payment")}>
          <form action={registerPurchasePayment} className="flex max-w-md flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={order.id} />
            <FormField label={t("po.payPh")} className="min-w-0 flex-1">
              <input name="amount" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
              {t("common.payment")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}
    </div>
  );
}
