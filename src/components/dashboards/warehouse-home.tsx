import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { D, qtyDisplay } from "@core/shared/decimal";
import { coverageAndPurchaseNeed } from "@core/inventory/alerts";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { DashPanel } from "@/components/dash-panel";
import { DashKpiGrid } from "@/components/dashboard/dashboard-system";
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
      <DashKpiGrid cols="2" tour="home-kpis">
        <KpiCard href="/warehouse" label={t("home.alert.stock")} value={String(low.length)} tone="out" />
        <KpiCard href="/purchasing" label={t("home.alert.purchase")} value={String(cover.purchaseNeed.length)} tone="out" />
      </DashKpiGrid>
      <DashPanel title={t("home.alert.stock")} tour="home-work">
        {low.length === 0 && cover.purchaseNeed.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">{t("home.noAlerts")}</p>
        ) : (
          <ul className="ui-list">
            {cover.purchaseNeed.slice(0, 8).map((n) => (
              <li key={n.name} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
                <span>{n.name}</span>
                <span className="font-mono text-xs tabular-nums">
                  {n.qty} {n.symbol}
                </span>
              </li>
            ))}
            {low.slice(0, 8).map((m) => {
              const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
              return (
                <li key={m.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
                  <span>{m.name}</span>
                  <span className="font-mono text-xs tabular-nums">
                    {qtyDisplay(onHand)} {m.storageUnit.symbol}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/warehouse/inventory" className="ui-btn-primary mt-3 inline-block text-center">
          {t("dash.quickCount")}
        </Link>
      </DashPanel>
      <DashPanel title={t("dash.queue")}>
        <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={6} className="ui-list">
          {movements.map((m) => (
            <li key={m.id} className="ui-list-row flex min-h-[44px] items-center justify-between gap-2 text-sm">
              <span className="truncate">
                {m.stockItem.material?.name ?? m.stockItem.product?.name ?? "—"} · {m.type}
              </span>
              <span className="shrink-0 text-[11px] text-[var(--color-text-muted)]">
                {m.createdAt.toLocaleString(intlLocale(locale), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </RevealList>
        <Link href="/warehouse/movements" className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          {t("wh.movesTitle")}
        </Link>
      </DashPanel>
    </div>
  );
}
