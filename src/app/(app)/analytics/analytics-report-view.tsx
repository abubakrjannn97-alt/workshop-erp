import Link from "next/link";
import { moneyDisplay } from "@core/shared/decimal";
import { createT, type Locale } from "@core/shared/i18n/i18n";
import { Segmented } from "@/components/segmented";
import { AnalyticsProductsSection } from "./analytics-products-section";
import type { AnalyticsReportData } from "./load-analytics";
import styles from "./analytics.module.css";

export function AnalyticsReportView({ locale, data }: { locale: Locale; data: AnalyticsReportData }) {
  const t = createT(locale);
  const { period } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("page.analytics")}</h1>
      </header>

      <div className={styles.periodWrap} data-tour="an-period">
        <Segmented
          className={styles.periodSeg}
          aria-label={t("orders.period")}
          items={[
            { href: "/analytics?period=today", label: t("orders.periodToday"), active: period === "today" },
            { href: "/analytics?period=week", label: t("orders.periodWeek"), active: period === "week" },
            { href: "/analytics?period=month", label: t("orders.periodMonth"), active: period === "month" },
            { href: "/analytics?period=all", label: t("orders.periodAll"), active: period === "all" },
          ]}
        />
      </div>

      <section className={styles.turnoverSection} data-tour="an-turnover">
        <p className={styles.turnoverEyebrow}>{t("an.workshopTurnover")}</p>
        <p className={styles.turnoverValue}>{moneyDisplay(data.sold)} с</p>
        <p className={styles.turnoverRange}>{data.rangeLabel}</p>

        <div className={styles.summaryRow} data-tour="an-summary">
          <article className={`${styles.summaryCard} ${data.netPositive ? styles.summaryOk : styles.summaryBad}`}>
            <p className={styles.summaryLabel}>{t("an.net")}</p>
            <p className={styles.summaryValue}>{moneyDisplay(data.net)} с</p>
          </article>
          <article className={`${styles.summaryCard} ${styles.summaryMuted}`}>
            <p className={styles.summaryLabel}>{t("an.totalExpenses")}</p>
            <p className={styles.summaryValue}>{moneyDisplay(data.totalExpenses)} с</p>
          </article>
          <article className={`${styles.summaryCard} ${styles.summaryScrap}`}>
            <p className={styles.summaryLabel}>{t("an.scrapMonth")}</p>
            <p className={styles.summaryValue}>{data.scrapQty} м²</p>
          </article>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>{t("an.saleTotal")}</h2>
          <p className={styles.cardHint}>{data.rangeLabel}</p>
        </div>
        <ul className={styles.rows}>
          <li className={styles.row}>
            <span>{t("an.sale")}</span>
            <strong>{moneyDisplay(data.sold)} с</strong>
          </li>
          <li className={styles.row}>
            <span>{t("an.receivedReal")}</span>
            <strong>{moneyDisplay(data.received)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.matCost")}</span>
            <strong>−{moneyDisplay(data.materialCost)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.payrollShort")}</span>
            <strong>−{moneyDisplay(data.payrollTotal)} с</strong>
          </li>
          <li className={`${styles.row} ${styles.rowMuted}`}>
            <span>{t("an.fixedExp")}</span>
            <strong>−{moneyDisplay(data.fixedExpenses)} с</strong>
          </li>
        </ul>
        <div className={styles.rowFoot}>
          <span>
            {t("an.profitInCash")}: <strong>{moneyDisplay(data.profit)} с</strong>
          </span>
          <Link href="/finance" className={styles.link}>
            {t("page.finance")}
          </Link>
        </div>
      </section>

      {data.scraps.length > 0 ? (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>{t("an.scrapBy")}</h2>
          </div>
          <ul className={styles.scrapList}>
            {data.scraps.map((s) => (
              <li key={s.id} className={styles.scrapRow}>
                <div className={styles.scrapMain}>
                  <p className={styles.scrapName}>{s.productName}</p>
                  <p className={styles.scrapWhen}>{s.when}</p>
                </div>
                <div className={styles.scrapRight}>
                  <p className={styles.scrapQty}>{s.qty}</p>
                  {s.damage ? (
                    <p className={styles.scrapDamageLine}>
                      {t("an.scrapDamage")}: <strong>{moneyDisplay(s.damage)} с</strong>
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AnalyticsProductsSection locale={locale} count={data.products.length}>
        <ul className={styles.productList}>
          {data.products.map((row) => (
            <li key={row.name} className={styles.productCard}>
              <p className={styles.productName}>{row.name}</p>
              <div className={styles.productGrid}>
                <div className={styles.productStat}>
                  <span className={styles.productStatLabel}>{t("an.sold")}</span>
                  <span className={styles.productStatValue}>
                    {row.qty} {row.unit}
                  </span>
                </div>
                <div className={styles.productStat}>
                  <span className={styles.productStatLabel}>{t("an.revenue")}</span>
                  <span className={styles.productStatValue}>{moneyDisplay(row.revenue)} с</span>
                </div>
                <div className={styles.productStat}>
                  <span className={styles.productStatLabel}>{t("an.fullCost")}</span>
                  <span className={styles.productStatValue}>{moneyDisplay(row.fullCost)} с</span>
                </div>
                <div className={styles.productStat}>
                  <span className={styles.productStatLabel}>{t("an.profit")}</span>
                  <span className={`${styles.productStatValue} ${row.ok ? styles.productStatOk : styles.productStatBad}`}>
                    {moneyDisplay(row.profit)} с · {row.margin}%
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </AnalyticsProductsSection>
    </div>
  );
}
