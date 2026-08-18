import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PurchaseOrderForm } from "./po-form";
import { moneyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { PageHeader } from "@/components/page-header";
import {
  DataList,
  DataListCell,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  DataTableSection,
  dataListStyles,
} from "@/components/data-table";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED"),
    POSTED: t("po.POSTED"),
    CANCELLED: t("po.CANCELLED"),
  };
  return map[s] ?? s;
}

export default async function PurchasingPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("purchasing.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canSuppliers =
    session.user.roleCode === "owner" || session.user.permissions.includes("suppliers.manage");

  const [orders, suppliers, materials] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: true },
      take: 50,
    }),
    prisma.supplier.findMany({
      where: { archivedAt: null },
      include: { orders: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("page.purchasing")} description={t("po.hint")} />

      <section className="ui-card" data-tour="po-suppliers">
        <h2 className="text-sm font-semibold">{t("po.suppliers")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {suppliers.map((s) => {
            const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
            const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
            return (
              <li key={s.id} className="flex justify-between gap-4">
                <Link href={`/purchasing/suppliers/${s.id}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
                <span className="font-mono text-xs">
                  {t("po.purchasesDebt", { t: moneyDisplay(turnover), d: moneyDisplay(debt) })}
                </span>
              </li>
            );
          })}
        </ul>
        {canSuppliers ? (
          <form action={createSupplier} className="mt-4 grid gap-2 sm:grid-cols-4">
            <input name="name" required placeholder={t("common.name")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="phone" placeholder={t("common.phone")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="contact" placeholder={t("common.contact")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">{t("common.add")}</button>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          materials={materials.map((m) => ({ id: m.id, name: m.name }))}
          locale={locale}
        />
      ) : null}

      <DataTableSection>
        {orders.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols5">
            <DataListHead layout="cols5">
              <DataListHeadCell>{t("common.number")}</DataListHeadCell>
              <DataListHeadCell>{t("common.supplier")}</DataListHeadCell>
              <DataListHeadCell>{t("common.status")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.amount")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
            </DataListHead>
            <ul className={dataListStyles.rows}>
              {orders.map((o) => (
                <DataListRow key={o.id} layout="cols5">
                  <DataListPrimary title={o.number} href={`/purchasing/${o.id}`} />
                  <DataListCell label={t("common.supplier")}>{o.supplier.name}</DataListCell>
                  <DataListCell label={t("common.status")}>{poStatus(t, o.status) ?? o.status}</DataListCell>
                  <DataListMetric label={t("common.amount")} value={`${moneyDisplay(o.total)} с`} />
                  <DataListMetric
                    label={t("common.debt")}
                    value={`${moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с`}
                  />
                </DataListRow>
              ))}
            </ul>
          </DataList>
        )}
      </DataTableSection>
    </div>
  );
}
