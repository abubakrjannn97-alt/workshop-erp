import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { moneyDisplay, D } from "@core/shared/decimal";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/styles/premium.module.css";

export default async function PurchasingPage() {
  const { t } = await getTranslator();
  await requirePermission("purchasing.view");

  const suppliers = await prisma.supplier.findMany({
    where: { archivedAt: null },
    include: { orders: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.purchasing")}</h1>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("po.suppliers")}</h2>
        </div>
        {suppliers.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {suppliers.map((s) => {
              const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
              const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
              return (
                <li key={s.id}>
                  <Link
                    href={`/purchasing/suppliers/${s.id}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 18px",
                      borderBottom: "1px solid var(--line)",
                      color: "inherit",
                      textDecoration: "none",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.name}</p>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
                        {t("po.purchasesDebt", { t: moneyDisplay(turnover), d: moneyDisplay(debt) })}
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={ICON_STROKE} style={{ flexShrink: 0, color: "var(--ink-3)" }} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
