import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { D, qtyDisplay } from "@core/shared/decimal";
import { coverageAndPurchaseNeed } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { RevealList } from "@/components/reveal-list";

export async function WarehouseHome() {
  const { t, locale } = await getTranslator();
  const [cover, movements, critical] = await Promise.all([
    coverageAndPurchaseNeed(),
    prisma.stockMovement.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { stockItem: { include: { material: true, product: true } } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
  ]);

  const low = critical.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("nav.home")} />
      <div className="grid gap-2 sm:grid-cols-2" data-tour="home-kpis">
        <KpiCard href="/warehouse" label={t("home.alert.stock")} value={String(low.length)} tone="out" />
        <KpiCard href="/purchasing" label={t("home.alert.purchase")} value={String(cover.purchaseNeed.length)} tone="out" />
      </div>
      <section className="ui-card" data-tour="home-work">
        <h2 className="text-sm font-semibold">{t("home.alert.stock")}</h2>
        {low.length === 0 && cover.purchaseNeed.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{t("home.noAlerts")}</p>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {cover.purchaseNeed.slice(0, 8).map((n) => (
              <li key={n.name} className="flex justify-between gap-2">
                <span>{n.name}</span>
                <span className="font-mono text-xs">
                  {n.qty} {n.symbol}
                </span>
              </li>
            ))}
            {low.slice(0, 8).map((m) => {
              const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
              return (
                <li key={m.id} className="flex justify-between gap-2">
                  <span>{m.name}</span>
                  <span className="font-mono text-xs">
                    {qtyDisplay(onHand)} {m.storageUnit.symbol}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/warehouse/inventory" className="mt-3 inline-block ui-btn-primary text-center">
          {t("dash.quickCount")}
        </Link>
      </section>
      <section className="ui-card">
        <h2 className="text-sm font-semibold">{t("dash.queue")}</h2>
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6}>
          {movements.map((m) => (
            <li key={m.id} className="flex justify-between gap-2 text-sm">
              <span className="truncate">
                {m.stockItem.material?.name ?? m.stockItem.product?.name ?? "—"} · {m.type}
              </span>
              <span className="shrink-0 text-[11px] text-[var(--muted)]">
                {m.createdAt.toLocaleString(intlLocale(locale), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </RevealList>
        <Link href="/warehouse/movements" className="mt-2 inline-block text-sm text-[var(--titan-dark)]">
          {t("wh.movesTitle")}
        </Link>
      </section>
    </div>
  );
}
