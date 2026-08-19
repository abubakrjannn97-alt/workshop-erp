import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { createInventoryCount } from "@/app/actions/inventory";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "../warehouse.module.css";

function countTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  return "warn";
}

export default async function InventoryListPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("inventory.count");
  const warehouses = await prisma.warehouse.findMany({ orderBy: { name: "asc" } });
  const counts = await prisma.inventoryCount.findMany({
    orderBy: { createdAt: "desc" },
    include: { warehouse: true },
    take: 50,
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("wh.invTitle")}</h1>
          <p className={styles.subtitle}>{t("wh.invHint")}</p>
        </div>
      </header>

      <WarehouseNav current="inventory" locale={locale} />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("wh.startCount")}</h2>
        </div>
        <div className={styles.sectionBody}>
          <form action={createInventoryCount} className="flex flex-wrap items-end gap-3">
            <FormField label={t("page.warehouse")} className="min-w-[12rem] flex-1">
              <select name="warehouseId" className="ui-input">
                {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
              </select>
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("wh.startCount")}</PendingButton>
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("wh.invTitle")}</h2>
        </div>
        {counts.length === 0 ? (
          <div className={styles.sectionBody}>
            <p style={{ color: "var(--ink-3)", fontSize: 14 }}>{t("common.empty")}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("page.warehouse")}</th>
                    <th>{t("wh.time")}</th>
                    <th>{t("common.status")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c) => (
                    <tr key={c.id}>
                      <td data-label={t("page.warehouse")}>
                        <Link href={`/warehouse/inventory/${c.id}`} className={styles.tdBold} style={{ textDecoration: "none", color: "var(--ink)" }}>
                          {n("wh", c.warehouse.code, c.warehouse.name)}
                        </Link>
                      </td>
                      <td className={styles.tdMuted} data-label={t("wh.time")}>{c.createdAt.toLocaleString(intlLocale(locale))}</td>
                      <td data-label={t("common.status")}>
                        <StatusBadge label={c.status === "DRAFT" ? t("wh.draft") : t("wh.posted")} tone={countTone(c.status)} />
                      </td>
                      <td>
                        <Link href={`/warehouse/inventory/${c.id}`} style={{ color: "var(--ink-3)" }}>
                          <ChevronRight size={16} strokeWidth={ICON_STROKE} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {counts.map((c) => (
                <li key={c.id}>
                  <Link href={`/warehouse/inventory/${c.id}`} className={styles.mobileCard} style={{ textDecoration: "none" }}>
                    <p className={styles.mobileName}>{n("wh", c.warehouse.code, c.warehouse.name)}</p>
                    <p className={styles.mobileMeta}>{c.createdAt.toLocaleString(intlLocale(locale))}</p>
                    <div style={{ marginTop: 8 }}>
                      <StatusBadge label={c.status === "DRAFT" ? t("wh.draft") : t("wh.posted")} tone={countTone(c.status)} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <p className="hidden">{session.user.id}</p>
    </div>
  );
}
