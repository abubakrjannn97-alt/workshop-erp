import { requirePermission } from "@core/auth/authz";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { WorkerSalaryBody } from "@/components/worker-salary-body";

export default async function WorkerSalaryPage() {
  const session = await requirePermission("production.view");
  const { t, locale, n } = await getTranslator();

  const [payouts, accounts] = await Promise.all([
    prisma.payrollPayout.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.cashAccount.findMany({ where: { archivedAt: null } }),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, n("cash", a.code, a.name)]));

  return (
    <WorkerSalaryBody
      title={t("nav.workerSalary")}
      locale={locale}
      payouts={payouts.map((p) => ({
        id: p.id,
        amount: String(p.amount),
        comment: p.comment,
        createdAt: p.createdAt.toISOString(),
        accountLabel: p.accountId ? accountMap.get(p.accountId) ?? "—" : "—",
      }))}
      periodLabels={{
        today: t("orders.periodToday"),
        week: t("orders.periodWeek"),
        month: t("orders.periodMonth"),
      }}
      emptyLabel={t("emp.noPayoutsYet")}
    />
  );
}
