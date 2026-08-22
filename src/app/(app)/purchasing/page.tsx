import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { moneyDisplay, D } from "@core/shared/decimal";
import { intlLocale } from "@core/shared/i18n/i18n";
import { orderPeriodLabel, resolveOrderDateRange, type OrderPeriod } from "@core/shared/order-period";
import { Segmented } from "@/components/segmented";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import { RevealList } from "@/components/reveal-list";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./purchasing.module.css";

type Period = Extract<OrderPeriod, "today" | "week" | "month" | "all">;

function parsePeriod(raw?: string): Period {
  if (raw === "today" || raw === "week" || raw === "month" || raw === "all") return raw;
  return "month";
}

function poLabel(t: (k: string) => string, status: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED"),
    POSTED: t("po.POSTED"),
    CANCELLED: t("po.CANCELLED"),
    PARTIAL: t("po.ORDERED"),
  };
  return map[status] ?? status;
}

function poTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  if (status === "CANCELLED") return "bad";
  if (status === "ORDERED" || status === "PARTIAL") return "info";
  if (status === "REQUEST") return "warn";
  return "neutral";
}

export default async function PurchasingPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { t, locale } = await getTranslator();
  await requirePermission("purchasing.view");
  const params = await searchParams;
  const period = parsePeriod(params.period);
  const range = resolveOrderDateRange({ period });
  const loc = intlLocale(locale);

  const orders = await prisma.purchaseOrder.findMany({
    where:
      range.from && range.to
        ? { createdAt: { gte: range.from, lte: range.to } }
        : undefined,
    include: { supplier: true },
    orderBy: { createdAt: "desc" },
  });

  const active = orders.filter((o) => o.status !== "CANCELLED");
  const total = active.reduce((s, o) => s.add(String(o.total)), D(0));
  const paid = active.reduce((s, o) => s.add(String(o.paidAmount)), D(0));
  const debt = total.sub(paid);
  const rangeLabel = orderPeriodLabel(period, t, range.from, range.to);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("page.purchasing")}</h1>
          <p className={styles.subtitle}>{t("po.reportHint")}</p>
        </div>
        <Link href="/purchasing/suppliers" className={styles.suppliersLink}>
          {t("po.suppliers")}
          <ChevronRight size={16} strokeWidth={ICON_STROKE} aria-hidden />
        </Link>
      </header>

      <div className={styles.periodWrap} data-tour="po-period">
        <Segmented
          aria-label={t("po.period")}
          items={[
            { href: "/purchasing?period=today", label: t("orders.periodToday"), active: period === "today" },
            { href: "/purchasing?period=week", label: t("po.periodWeek"), active: period === "week" },
            { href: "/purchasing?period=month", label: t("po.periodMonth"), active: period === "month" },
            { href: "/purchasing?period=all", label: t("orders.periodAll"), active: period === "all" },
          ]}
        />
      </div>

      <section className={styles.report} data-tour="po-report">
        <p className={styles.reportEyebrow}>{t("po.reportTitle")}</p>
        <p className={styles.reportRange}>{rangeLabel}</p>
        <p className={styles.reportTotal}>{moneyDisplay(total)} с</p>
        <div className={styles.reportMeta}>
          <div>
            <span className={styles.metaLabel}>{t("po.reportCount")}</span>
            <strong>{String(active.length)}</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>{t("common.paid")}</span>
            <strong>{moneyDisplay(paid)} с</strong>
          </div>
          <div>
            <span className={styles.metaLabel}>{t("common.debt")}</span>
            <strong className={debt.gt(0) ? styles.metaDebt : undefined}>{moneyDisplay(debt)} с</strong>
          </div>
        </div>
      </section>

      <section className={styles.section} data-tour="po-history">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("po.history")}</h2>
        </div>
        {orders.length === 0 ? (
          <div className={styles.empty}>{t("po.historyEmpty")}</div>
        ) : (
          <RevealList moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5} className={styles.list}>
            {orders.map((order) => {
              const lineDebt = D(String(order.total)).sub(order.paidAmount);
              return (
                <li key={order.id}>
                  <Link href={`/purchasing/${order.id}`} className={styles.row}>
                    <div className={styles.rowMain}>
                      <p className={styles.rowTitle}>
                        {order.number}
                        <span className={styles.rowSupplier}> · {order.supplier.name}</span>
                      </p>
                      <p className={styles.rowMeta}>
                        {order.createdAt.toLocaleDateString(loc, {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                        {lineDebt.gt(0) ? ` · ${t("common.debt")} ${moneyDisplay(lineDebt)} с` : ""}
                      </p>
                    </div>
                    <div className={styles.rowRight}>
                      <span className={styles.rowAmount}>{moneyDisplay(order.total)} с</span>
                      <StatusBadge label={poLabel(t, order.status)} tone={poTone(order.status)} />
                    </div>
                    <ChevronRight size={16} strokeWidth={ICON_STROKE} className={styles.chevron} aria-hidden />
                  </Link>
                </li>
              );
            })}
          </RevealList>
        )}
      </section>
    </div>
  );
}
