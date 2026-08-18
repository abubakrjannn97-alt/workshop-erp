import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PurchaseOrderForm } from "./po-form";
import { moneyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
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
import { StatusBadge, type BadgeTone } from "@/components/status-badge";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED"),
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

      <DashPanel title={t("po.suppliers")} tour="po-suppliers">
        <ul className="space-y-2 text-sm">
          {suppliers.map((s) => {
            const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
            const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
            return (
              <li key={s.id} className="flex min-w-0 justify-between gap-4">
                <Link href={`/purchasing/suppliers/${s.id}`} className="min-w-0 truncate font-medium hover:underline">
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
          <form action={createSupplier} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label={t("common.name")} required>
              <input name="name" required className="ui-input" />
            </FormField>
            <FormField label={t("common.phone")}>
              <input name="phone" className="ui-input" />
            </FormField>
            <FormField label={t("common.contact")}>
              <input name="contact" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-4" pendingLabel={t("common.sending")}>
              {t("common.add")}
            </PendingButton>
          </form>
        ) : null}
      </DashPanel>

      {canManage ? (
        <DashPanel title={t("po.createRequest")} tour="po-new">
          <PurchaseOrderForm
            suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
            materials={materials.map((m) => ({ id: m.id, name: m.name }))}
            locale={locale}
          />
        </DashPanel>
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
                  <DataListCell label={t("common.status")}>
                    <StatusBadge label={poStatus(t, o.status) ?? o.status} tone={poTone(o.status)} />
                  </DataListCell>
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
