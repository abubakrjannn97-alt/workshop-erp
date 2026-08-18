import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { RevealList } from "@/components/reveal-list";
import {
  DataList,
  DataListEmpty,
  DataListHead,
  DataListHeadCell,
  DataListMetric,
  DataListPrimary,
  DataListRow,
  dataListStyles,
} from "@/components/data-table";

export default async function FinanceReportsPage() {
  await requirePermission("finance.view");
  const { t, locale } = await getTranslator();

  const [obligations, purchases] = await Promise.all([
    prisma.obligation.findMany({ where: { status: "OPEN" }, orderBy: { dueAt: "asc" } }),
    prisma.purchaseOrder.findMany({
      where: { status: { not: "CANCELLED" } },
      include: { supplier: true },
    }),
  ]);

  const debts = purchases.filter((o) => D(String(o.total)).sub(o.paidAmount).gt(0));

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.reports")} description={t("fin.reportsHint")} />
      <DashPanel title={t("fin.supplierDebt")}>
        {debts.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("common.supplier")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8} className={dataListStyles.rows}>
              {debts.map((o) => (
                <DataListRow key={o.id} layout="cols2">
                  <DataListPrimary title={o.supplier.name} subtitle={o.number} />
                  <DataListMetric
                    label={t("common.debt")}
                    value={`${moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с`}
                    tone="bad"
                  />
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </DashPanel>
      <DashPanel title={t("fin.obligations")}>
        {obligations.length === 0 ? (
          <DataListEmpty>{t("common.empty")}</DataListEmpty>
        ) : (
          <DataList layout="cols2">
            <DataListHead layout="cols2">
              <DataListHeadCell>{t("list.col.what")}</DataListHeadCell>
              <DataListHeadCell align="right">{t("common.debt")}</DataListHeadCell>
            </DataListHead>
            <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8} className={dataListStyles.rows}>
              {obligations.map((o) => (
                <DataListRow key={o.id} layout="cols2">
                  <DataListPrimary
                    title={o.name}
                    subtitle={o.dueAt ? o.dueAt.toLocaleDateString(intlLocale(locale)) : undefined}
                  />
                  <DataListMetric
                    label={t("common.debt")}
                    value={`${moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с`}
                    tone="bad"
                  />
                </DataListRow>
              ))}
            </RevealList>
          </DataList>
        )}
      </DashPanel>
    </div>
  );
}
