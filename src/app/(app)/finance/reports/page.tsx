import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { RevealList } from "@/components/reveal-list";

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
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("fin.supplierDebt")}</h2>
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
          {debts.map((o) => (
            <li key={o.id} className="flex justify-between gap-2 text-sm">
              <span className="truncate">
                {o.supplier.name} · {o.number}
              </span>
              <span className="font-mono text-xs">{moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с</span>
            </li>
          ))}
        </RevealList>
      </section>
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("fin.obligations")}</h2>
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
          {obligations.map((o) => (
            <li key={o.id} className="flex justify-between gap-2 text-sm">
              <span className="truncate">{o.name}</span>
              <span className="shrink-0 font-mono text-xs">
                {moneyDisplay(D(String(o.amount)).sub(o.paidAmount))} с
                {o.dueAt ? ` · ${o.dueAt.toLocaleDateString(intlLocale(locale))}` : ""}
              </span>
            </li>
          ))}
        </RevealList>
      </section>
    </div>
  );
}
