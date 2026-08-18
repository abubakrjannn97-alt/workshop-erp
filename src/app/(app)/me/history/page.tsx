import { requirePermission } from "@core/auth/authz";
import { prisma } from "@/lib/prisma";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@/lib/locale";
import { PageHeader } from "@/components/page-header";
import Link from "next/link";

export default async function MyHistoryPage() {
  const session = await requirePermission("production.view");
  const { t, locale } = await getTranslator();

  const batches = await prisma.productionBatch.findMany({
    where: { responsibleUserId: session.user.id, status: "CLOSED" },
    include: {
      production: { include: { order: { include: { customer: true, items: { include: { product: true } } } } } },
    },
    orderBy: { producedAt: "desc" },
    take: 40,
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.history")} description={t("me.historyHint")} />
      {batches.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("me.noHistory")}</p>
      ) : (
        <ul className="space-y-2">
          {batches.map((b) => (
            <li key={b.id} className="ui-card px-4 py-3 text-sm">
              <Link href={`/production/${b.productionOrderId}`} className="font-medium hover:underline">
                {b.production.order.items[0]?.product.name ?? "—"} · {b.production.order.customer.name}
              </Link>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {t("prod.goodQty")}: {qtyDisplay(b.actualQty)} · {t("common.scrap")}: {qtyDisplay(b.scrapQty)}
                {b.producedAt ? ` · ${b.producedAt.toLocaleDateString(intlLocale(locale))}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
