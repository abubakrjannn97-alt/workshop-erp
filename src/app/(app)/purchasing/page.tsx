import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PurchaseOrderForm } from "./po-form";
import { moneyDisplay, D } from "@core/shared/decimal";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/styles/premium.module.css";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = { REQUEST: t("po.REQUEST"), ORDERED: t("po.ORDERED"), POSTED: t("po.POSTED"), CANCELLED: t("po.CANCELLED") };
  return map[s] ?? s;
}
function poTone(status: string): BadgeTone {
  if (status === "POSTED") return "good"; if (status === "CANCELLED") return "bad"; if (status === "ORDERED") return "info"; if (status === "REQUEST") return "warn"; return "neutral";
}

export default async function PurchasingPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("purchasing.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canSuppliers = session.user.roleCode === "owner" || session.user.permissions.includes("suppliers.manage");

  const [orders, suppliers, materials] = await Promise.all([
    prisma.purchaseOrder.findMany({ orderBy: { createdAt: "desc" }, include: { supplier: true }, take: 50 }),
    prisma.supplier.findMany({ where: { archivedAt: null }, include: { orders: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.purchasing")}</h1>
          <p className={styles.subtitle}>{t("po.hint")}</p>
        </div>
      </header>

      <section className={styles.section} data-tour="po-suppliers">
        <div className={styles.sectionHead}><h2 className={styles.sectionTitleAccent}>{t("po.suppliers")}</h2></div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {suppliers.map((s) => {
              const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
              const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
              return (
                <li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13, alignItems: "center" }}>
                  <Link href={`/purchasing/suppliers/${s.id}`} style={{ fontWeight: 500, color: "var(--ink)", textDecoration: "none" }}>{s.name}</Link>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, whiteSpace: "nowrap" }}>{t("po.purchasesDebt", { t: moneyDisplay(turnover), d: moneyDisplay(debt) })}</span>
                </li>
              );
            })}
          </ul>
          {canSuppliers ? (
            <form action={createSupplier} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label={t("common.name")} required><input name="name" required className="ui-input" /></FormField>
              <FormField label={t("common.phone")}><input name="phone" className="ui-input" /></FormField>
              <FormField label={t("common.contact")}><input name="contact" className="ui-input" /></FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-4" pendingLabel={t("common.sending")}>{t("common.add")}</PendingButton>
            </form>
          ) : null}
        </div>
      </section>

      {canManage ? (
        <section className={styles.section} data-tour="po-new">
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("po.createRequest")}</h2></div>
          <div className={styles.sectionBody}>
            <PurchaseOrderForm suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))} materials={materials.map((m) => ({ id: m.id, name: m.name }))} locale={locale} />
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("page.purchasing")}</h2></div>
        {orders.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>{t("common.number")}</th>
                  <th>{t("common.supplier")}</th>
                  <th>{t("common.status")}</th>
                  <th className={styles.thRight}>{t("common.amount")}</th>
                  <th className={styles.thRight}>{t("common.debt")}</th>
                </tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/purchasing/${o.id}`} className={styles.tdLink}>{o.number}</Link></td>
                      <td>{o.supplier.name}</td>
                      <td><StatusBadge label={poStatus(t, o.status)} tone={poTone(o.status)} /></td>
                      <td className={styles.tdRight}>{moneyDisplay(o.total)} с</td>
                      <td className={styles.tdRight}>{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/purchasing/${o.id}`} className={styles.mobileCard}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className={styles.mobileName}>{o.number}</span>
                      <StatusBadge label={poStatus(t, o.status)} tone={poTone(o.status)} />
                    </div>
                    <p className={styles.mobileMeta}>{o.supplier.name}</p>
                    <p className={styles.mobileRow}>{moneyDisplay(o.total)} с</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
