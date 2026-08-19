import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import styles from "../production.module.css";

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
          production: { include: { order: { include: { items: { include: { product: { include: { outputUnit: true } } } } } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const loc = intlLocale(locale);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("nav.scrap")}</h1>
          <p className={styles.subtitle}>{t("prod.scrapHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/production" className={styles.ghostLink}>{t("page.production")}</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("nav.scrap")}</h2>
        </div>
        {scraps.length === 0 ? (
          <div className={styles.sectionBody}>
            <EmptyState icon={TriangleAlert} title={t("an.noScrap")} description="" />
          </div>
        ) : (
          <>
            <div className={`${styles.tableHead} ${styles.cols3}`}>
              <span>{t("common.product")}</span>
              <span>{t("list.col.when")}</span>
              <span className={styles.tableHeadRight}>{t("common.qty")}</span>
            </div>
            <ul className={styles.tableBody}>
              {scraps.map((s) => {
                const product = s.batch.production.order.items[0]?.product;
                const unitSymbol = product?.outputUnit?.symbol ?? t("common.unitGeneric");
                return (
                  <li key={s.id}>
                    <Link href={`/production/${s.batch.productionOrderId}`} className={`${styles.tableRow} ${styles.cols3}`}>
                      <span className={styles.cellBold}>{product?.name ?? "—"}</span>
                      <span className={styles.cellText}>{s.createdAt.toLocaleDateString(loc)}</span>
                      <span className={styles.cellMono}>{qtyDisplay(s.quantity)} {unitSymbol}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <ul className={styles.mobileList}>
              {scraps.map((s) => {
                const product = s.batch.production.order.items[0]?.product;
                const unitSymbol = product?.outputUnit?.symbol ?? t("common.unitGeneric");
                return (
                  <li key={s.id}>
                    <Link href={`/production/${s.batch.productionOrderId}`} className={styles.mobileCard}>
                      <div className={styles.mobileTop}>
                        <span className={styles.mobileName}>{product?.name ?? "—"}</span>
                        <span className={styles.chevron} aria-hidden><ChevronRight size={16} strokeWidth={ICON_STROKE} /></span>
                      </div>
                      <p className={styles.mobileMeta}>{s.createdAt.toLocaleDateString(loc)} · {qtyDisplay(s.quantity)} {unitSymbol}</p>
                      {s.reason ? <p className={styles.mobileMeta}>{s.reason}</p> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
