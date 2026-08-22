import { requirePermission } from "@core/auth/authz";
import { hasWorkerShell } from "@core/worker/worker-shell";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { qtyDisplay } from "@core/shared/decimal";
import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import Link from "next/link";
import styles from "@/styles/premium.module.css";

export default async function MyHistoryPage() {
  const session = await requirePermission("production.view");
  if (hasWorkerShell(session.user.roleCode, session.user.permissions ?? [])) redirect("/me");
  const { t, locale } = await getTranslator();

  const batches = await prisma.productionBatch.findMany({
    where: { responsibleUserId: session.user.id, status: "CLOSED" },
    include: { production: { include: { order: { include: { customer: true, items: { include: { product: true } } } } } } },
    orderBy: { producedAt: "desc" }, take: 40,
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}><div className={styles.headerText}><h1 className={styles.title}>{t("nav.history")}</h1><p className={styles.subtitle}>{t("me.historyHint")}</p></div></header>
      {batches.length === 0 ? (
        <section className={styles.section}><div className={styles.empty}>{t("me.noHistory")}</div></section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionBody} style={{ padding: "12px 18px" }}>
            {batches.map((b) => (
              <div key={b.id} style={{ padding: "10px 0", borderBottom: "1px solid var(--line)" }}>
                <Link href={`/production/${b.productionOrderId}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--accent)", textDecoration: "none" }}>
                  {b.production.order.items[0]?.product.name ?? "—"} · {b.production.order.customer.name}
                </Link>
                <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                  {t("prod.goodQty")}: {qtyDisplay(b.actualQty)} · {t("common.scrap")}: {qtyDisplay(b.scrapQty)}
                  {b.producedAt ? ` · ${b.producedAt.toLocaleDateString(intlLocale(locale))}` : ""}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
