import { PageHeader } from "@/components/page-header";
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

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED_FULL"),
    POSTED: t("po.POSTED"),
    CANCELLED: t("po.CANCELLED"),
  };
  return map[s] ?? s;
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
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
      <div>
        <p className="text-xs text-[var(--muted)]">{poStatus(t, order.status)}</p>
        <PageHeader title={order.number} />
        <p className="text-sm text-[var(--text-muted)]">{order.supplier.name}</p>
        <Link href={`/purchasing/${order.id}/print`} className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          {t("po.printWaybill")}
        </Link>
      </div>
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
                  <td className="px-4 py-3">{item.material.name}</td>
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
      <div className="flex flex-wrap gap-2">
        {canManage && order.status === "REQUEST" ? (
          <form action={confirmPurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="ui-btn-primary">{t("po.confirmToSupplier")}</button>
          </form>
        ) : null}
        {canReceive && (order.status === "ORDERED" || order.status === "REQUEST") ? (
          <form action={receivePurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="ui-btn-primary">{t("po.acceptPost")}</button>
          </form>
        ) : null}
        {canManage && order.status !== "POSTED" && order.status !== "CANCELLED" ? (
          <form action={cancelPurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="rounded-lg px-4 py-2 text-sm text-[var(--danger)]">{t("common.cancel")}</button>
          </form>
        ) : null}
      </div>
      {canManage && order.status !== "CANCELLED" ? (
        <form action={registerPurchasePayment} className="flex max-w-md gap-2">
          <input type="hidden" name="id" value={order.id} />
          <input name="amount" placeholder={t("po.payPh")} className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
          <button className="ui-btn-primary">{t("common.payment")}</button>
        </form>
      ) : null}
    </div>
  );
}
