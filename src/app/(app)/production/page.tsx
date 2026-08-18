import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { StatusBadge, jobTone } from "@/components/status-badge";
import { PageHeader } from "@/components/page-header";
import { UiTable } from "@/components/ui-table";
import { RevealList } from "@/components/reveal-list";

function jobStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    OPEN: t("prod.open"),
    IN_PROGRESS: t("prod.inProgress"),
    DONE: t("prod.done"),
  };
  return map[s] ?? s;
}

export default async function ProductionPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");
  const jobs = await prisma.productionOrder.findMany({
    where:
      session.user.roleCode === "worker"
        ? { batches: { some: { responsibleUserId: session.user.id } } }
        : undefined,
    include: {
      order: { include: { customer: true, items: { include: { product: true } } } },
      batches: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("page.production")} description={t("prod.hint")} />
      <section className="overflow-hidden ui-card" data-tour="production-list">
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2">{t("common.customer")}</th>
                <th className="px-4 py-2">{t("common.product")}</th>
                <th className="px-4 py-2">{t("common.progress")}</th>
                <th className="px-4 py-2">{t("common.scrap")}</th>
                <th className="px-4 py-2">{t("common.status")}</th>
              </tr>
            </thead>
            {jobs.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-[var(--muted)]">
                    {t("prod.empty")}
                  </td>
                </tr>
              </tbody>
            ) : (
              <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
                {jobs.map((job) => {
                  const product = job.order.items[0]?.product.name ?? "—";
                  return (
                    <tr key={job.id}>
                      <td className="px-4 py-2">
                        <Link href={`/production/${job.id}`} className="font-medium hover:underline">
                          {job.order.customer.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2" data-label={t("common.product")}>
                        {product}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs" data-label={t("common.progress")}>
                        {qtyDisplay(job.producedQty)} / {qtyDisplay(job.plannedQty)}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs" data-label={t("common.scrap")}>
                        {qtyDisplay(job.scrapQty)}
                      </td>
                      <td className="px-4 py-2" data-label={t("common.status")}>
                        <StatusBadge label={jobStatus(t, job.status) ?? job.status} tone={jobTone(job.status)} />
                      </td>
                    </tr>
                  );
                })}
              </RevealList>
            )}
          </table>
        </UiTable>
      </section>
    </div>
  );
}
