import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { ChevronRight, Layers } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { EmptyState } from "@/components/empty-state";
import styles from "../production.module.css";

export default async function BatchesPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("production.view");
  const { isProductionScopedWorker } = await import("@core/production/batch-auth");
  const scoped = isProductionScopedWorker(session.user.roleCode, session.user.permissions ?? []);
  const batches = await prisma.productionBatch.findMany({
    where: { status: "OPEN", ...(scoped ? { responsibleUserId: session.user.id } : {}) },
    include: {
      production: { include: { order: { include: { customer: true, items: { include: { product: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("nav.batches")}</h1>
          <p className={styles.subtitle}>{t("prod.batchesHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/production" className={styles.ghostLink}>{t("page.production")}</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("nav.batches")}</h2>
        </div>
        {batches.length === 0 ? (
          <div className={styles.sectionBody}>
            <EmptyState icon={Layers} title={t("prod.noBatches")} description="" />
          </div>
        ) : (
          <>
            <div className={`${styles.tableHead} ${styles.cols3}`}>
              <span>{t("prod.batch")}</span>
              <span>{t("common.product")}</span>
              <span className={styles.tableHeadRight}>{t("orders.plan")}</span>
            </div>
            <ul className={styles.tableBody}>
              {batches.map((b) => (
                <li key={b.id}>
                  <Link href={`/production/${b.productionOrderId}`} className={`${styles.tableRow} ${styles.cols3}`}>
                    <span className={styles.cellBold}>№{b.number} · {b.production.order.customer.name}</span>
                    <span className={styles.cellText}>{b.production.order.items[0]?.product.name ?? "—"}</span>
                    <span className={styles.cellMono}>{qtyDisplay(b.plannedQty)}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <ul className={styles.mobileList}>
              {batches.map((b) => (
                <li key={b.id}>
                  <Link href={`/production/${b.productionOrderId}`} className={styles.mobileCard}>
                    <div className={styles.mobileTop}>
                      <span className={styles.mobileName}>№{b.number} · {b.production.order.customer.name}</span>
                      <span className={styles.chevron} aria-hidden><ChevronRight size={16} strokeWidth={ICON_STROKE} /></span>
                    </div>
                    <p className={styles.mobileMeta}>{b.production.order.items[0]?.product.name ?? "—"} · {qtyDisplay(b.plannedQty)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
