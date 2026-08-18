import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";

export default async function ScrapPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("production.view");
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const scraps = await prisma.scrapRecord.findMany({
    where: { createdAt: { gte: start } },
    include: {
      batch: {
        include: {
          production: { include: { order: { include: { items: { include: { product: true } } } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.scrap")} description={t("prod.scrapHint")} />
      {scraps.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{t("an.noScrap")}</p>
      ) : (
        <ul className="space-y-2">
          {scraps.map((s) => (
            <li key={s.id} className="ui-card px-4 py-3 text-sm">
              <Link href={`/production/${s.batch.productionOrderId}`} className="font-medium hover:underline">
                {s.batch.production.order.items[0]?.product.name ?? "—"}
              </Link>
              <p className="mt-1 text-[12px] text-[var(--muted)]">
                {qtyDisplay(s.quantity)} м² · {s.reason} · {s.createdAt.toLocaleDateString(intlLocale(locale))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
