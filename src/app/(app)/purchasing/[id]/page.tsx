import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { cancelPurchaseOrder, confirmPurchaseOrder, receivePurchaseOrder, registerPurchasePayment } from "@/app/actions/purchasing";
import { moneyDisplay, qtyDisplay, D } from "@core/shared/decimal";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import { FormField } from "@/components/form-field";
import styles from "@/styles/premium.module.css";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = { REQUEST: t("po.REQUEST"), ORDERED: t("po.ORDERED_FULL"), POSTED: t("po.POSTED"), CANCELLED: t("po.CANCELLED") };
  return map[s] ?? s;
}
function poTone(status: string): BadgeTone {
  if (status === "POSTED") return "good"; if (status === "CANCELLED") return "bad"; if (status === "ORDERED") return "info"; if (status === "REQUEST") return "warn"; return "neutral";
}

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslator();
  const { id } = await params;
  const session = await requirePermission("purchasing.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canReceive = session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.receive");
  const order = await prisma.purchaseOrder.findUnique({ where: { id }, include: { supplier: true, items: { include: { material: { include: { storageUnit: true } } } }, payments: true } });
  if (!order) notFound();
  const debt = D(String(order.total)).sub(order.paidAmount);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{order.number}</h1>
          <p className={styles.subtitle}>{order.supplier.name}</p>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge label={poStatus(t, order.status)} tone={poTone(order.status)} />
          <Link href={`/purchasing/${order.id}/print`} className={styles.ghostLink}>{t("po.printWaybill")}</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr>
              <th>{t("common.material")}</th>
              <th className={styles.thRight}>{t("common.qty")}</th>
              <th className={styles.thRight}>{t("common.price")}</th>
              <th className={styles.thRight}>{t("common.amount")}</th>
            </tr></thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className={styles.tdBold}>{item.material.name}</td>
                  <td className={styles.tdRight}>{qtyDisplay(item.quantity)} {item.material.storageUnit.symbol}</td>
                  <td className={styles.tdRight}>{moneyDisplay(item.unitPrice)}</td>
                  <td className={styles.tdRight}>{moneyDisplay(item.amount)} с</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.mobileList}>
          {order.items.map((item) => (
            <li key={item.id} className={styles.mobileCard}>
              <span className={styles.mobileName}>{item.material.name}</span>
              <p className={styles.mobileMeta}>{qtyDisplay(item.quantity)} {item.material.storageUnit.symbol} × {moneyDisplay(item.unitPrice)} = {moneyDisplay(item.amount)} с</p>
            </li>
          ))}
        </ul>
      </section>

      <p style={{ fontSize: 14, color: "var(--ink-2)" }}>{t("po.summary", { total: moneyDisplay(order.total), paid: moneyDisplay(order.paidAmount), debt: moneyDisplay(debt) })}</p>

      {(canManage && order.status === "REQUEST") || (canReceive && (order.status === "ORDERED" || order.status === "REQUEST")) || (canManage && order.status !== "POSTED" && order.status !== "CANCELLED") ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("common.actions")}</h2></div>
          <div className={styles.sectionBody}>
            <div className="flex flex-wrap gap-2">
              {canManage && order.status === "REQUEST" ? (<form action={confirmPurchaseOrder}><input type="hidden" name="id" value={order.id} /><PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("po.confirmToSupplier")}</PendingButton></form>) : null}
              {canReceive && (order.status === "ORDERED" || order.status === "REQUEST") ? (<form action={receivePurchaseOrder}><input type="hidden" name="id" value={order.id} /><PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("po.acceptPost")}</PendingButton></form>) : null}
              {canManage && order.status !== "POSTED" && order.status !== "CANCELLED" ? (<form action={cancelPurchaseOrder}><input type="hidden" name="id" value={order.id} /><PendingButton className={styles.dangerBtn} pendingLabel={t("common.sending")}>{t("common.cancel")}</PendingButton></form>) : null}
            </div>
          </div>
        </section>
      ) : null}

      {canManage && order.status !== "CANCELLED" ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("common.payment")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={registerPurchasePayment} className="flex max-w-md flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={order.id} />
              <FormField label={t("po.payPh")} className="min-w-0 flex-1"><input name="amount" className="ui-input" /></FormField>
              <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("common.payment")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
