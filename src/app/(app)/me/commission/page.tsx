import { redirect } from "next/navigation";
import { requireSession } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { D, moneyDisplay } from "@core/shared/decimal";
import { periodKey, periodRange } from "@/lib/payroll";
import { getTranslator } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";

export default async function MyCommissionPage() {
  const session = await requireSession();
  const role = session.user.roleCode;
  if (role !== "sales_manager" && role !== "owner" && role !== "director") {
    redirect("/");
  }
  const { t } = await getTranslator();
  const userId = session.user.id;
  const key = periodKey();
  const { start, end } = periodRange(key);

  const [accruals, orders] = await Promise.all([
    prisma.payrollAccrual.findMany({
      where: { userId, kind: "COMMISSION", periodKey: key },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.order.findMany({
      where: { sellerId: userId, createdAt: { gte: start, lt: end }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
    }),
  ]);

  const earned = accruals
    .filter((a) => a.status === "ACCRUED")
    .reduce((s, a) => s.add(String(a.amount)), D(0));
  const paid = orders.reduce((s, o) => s.add(String(o.paidAmount)), D(0));

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.commission")} description={t("me.commissionHint")} />
      <div className="grid gap-2 sm:grid-cols-2">
        <KpiCard label={t("me.earned")} value={`${moneyDisplay(earned)} с`} tone="in" />
        <KpiCard label={t("emp.clientPaid")} value={`${moneyDisplay(paid)} с`} tone="in" />
      </div>
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("emp.accruals")}</h2>
        {accruals.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("emp.noneYet")}</p>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={8}>
            {accruals.map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span>{a.comment ?? t("emp.commission")}</span>
                <span className="font-mono text-xs">{moneyDisplay(a.amount)} с</span>
              </li>
            ))}
          </RevealList>
        )}
      </section>
    </div>
  );
}
