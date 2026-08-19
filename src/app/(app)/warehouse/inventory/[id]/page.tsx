import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { confirmInventoryCount } from "@/app/actions/inventory";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";
import { HeaderBackButton } from "@/components/header-back-button";
import styles from "../../warehouse.module.css";

function countTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  return "warn";
}

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, n, locale } = await getTranslator();
  const { id } = await params;
  await requirePermission("inventory.count");
  const session = await requirePermission("inventory.view");
  const canConfirm = session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      warehouse: true,
      lines: { include: { stockItem: { include: { material: true, product: true } } } },
    },
  });
  if (!count) notFound();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} />
          <div className={styles.headerText}>
          <h1 className={styles.title}>{t("wh.countTitle")} · {n("wh", count.warehouse.code, count.warehouse.name)}</h1>
        </div>
        </div>
        <div className={styles.headerActions}>
          <StatusBadge label={count.status === "DRAFT" ? t("wh.Draft") : t("wh.Posted")} tone={countTone(count.status)} />
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("wh.invTitle")}</h2>
        </div>
        <form action={confirmInventoryCount}>
          <input type="hidden" name="id" value={count.id} />
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t("wh.position")}</th>
                  <th className={styles.thRight}>{t("wh.byBooks")}</th>
                  <th className={styles.thRight}>{t("wh.fact")}</th>
                  <th className={styles.thRight}>{t("wh.diff")}</th>
                </tr>
              </thead>
              <tbody>
                {count.lines.map((line) => (
                  <tr key={line.id}>
                    <td data-label={t("wh.position")}>
                      <span className={styles.tdBold}>{line.stockItem.material?.name ?? line.stockItem.product?.name}</span>
                      <input type="hidden" name="lineId" value={line.id} />
                    </td>
                    <td className={styles.tdRight} data-label={t("wh.byBooks")}>{qtyDisplay(line.systemQty)}</td>
                    <td className={styles.tdRight} data-label={t("wh.fact")}>
                      <input name="actualQty" defaultValue={line.actualQty.toString()} disabled={count.status !== "DRAFT"} className="ui-input w-28 text-right" />
                    </td>
                    <td className={styles.tdRight} data-label={t("wh.diff")}>{qtyDisplay(line.difference)} / {moneyDisplay(line.amount)} с</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {count.status === "DRAFT" && canConfirm ? (
            <div className={styles.sectionBody}>
              <FormField label={t("wh.diffReason")} required>
                <input name="reason" required className="ui-input" />
              </FormField>
              <div style={{ marginTop: 12 }}>
                <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>{t("wh.confirmAdjust")}</PendingButton>
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <p style={{ fontSize: 12, color: "var(--ink-3)" }}>
        {t("wh.invExample")}
        {t("wh.invWac")}: {count.lines[0] ? moneyDisplay(D(String(count.lines[0].unitCost))) : "—"} {t("po.perUnit")}
      </p>
    </div>
  );
}
