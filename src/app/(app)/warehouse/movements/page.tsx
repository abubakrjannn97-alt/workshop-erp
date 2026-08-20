import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { reverseStockMovement } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
import styles from "../warehouse.module.css";

function moveType(t: (k: string) => string, code: string) {
  const map: Record<string, string> = {
    RECEIPT: t("wh.move.RECEIPT"),
    RESERVE: t("wh.move.RESERVE"),
    RELEASE: t("wh.move.UNRESERVE"),
    ISSUE: t("wh.move.ISSUE"),
    RETURN: t("wh.move.RETURN"),
    WRITE_OFF: t("wh.move.WRITE_OFF"),
    INVENTORY: t("wh.move.INVENTORY"),
    ADJUST: t("wh.move.ADJUST"),
    TRANSFER_OUT: t("wh.move.TRANSFER_OUT"),
    TRANSFER_IN: t("wh.move.TRANSFER_IN"),
    REVERSAL: t("wh.move.REVERSAL"),
  };
  return map[code] ?? code;
}

export default async function MovementsPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canAdjust = session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const movements = await prisma.stockMovement.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: true,
      stockItem: { include: { material: true, product: true } },
      reversedBy: true,
    },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("wh.movesTitle")}</h1>
          <p className={styles.subtitle}>{t("wh.movesHint")}</p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("wh.movesTitle")}</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("wh.time")}</th>
                <th>{t("wh.type")}</th>
                <th>{t("wh.position")}</th>
                <th className={styles.thRight}>{t("common.qty")}</th>
                <th className={styles.thRight}>{t("common.amount")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className={styles.tdMuted} data-label={t("wh.time")}>{m.createdAt.toLocaleString(intlLocale(locale))}</td>
                  <td data-label={t("wh.type")}>{moveType(t, m.type)}</td>
                  <td data-label={t("wh.position")}>
                    <span className={styles.tdBold}>{m.stockItem.material?.name ?? m.stockItem.product?.name}</span>
                    <p className={styles.tdMuted}>{n("wh", m.warehouse.code, m.warehouse.name)}</p>
                  </td>
                  <td className={styles.tdRight} data-label={t("common.qty")}>{qtyDisplay(m.qty)}</td>
                  <td className={styles.tdRight} data-label={t("common.amount")}>{moneyDisplay(m.amount)} с</td>
                  <td className={styles.tdAction}>
                    {canAdjust && !m.reversedBy && m.type !== "REVERSAL" ? (
                      <form action={reverseStockMovement}>
                        <input type="hidden" name="id" value={m.id} />
                        <IdempotencyField prefix={`rev-${m.id}`} />
                        <button className={styles.revBtn}>{t("wh.revBtn")}</button>
                      </form>
                    ) : m.reversedBy ? (
                      <span className={styles.reversedTag}>{t("wh.reversed")}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className={styles.mobileList}>
          {movements.map((m) => (
            <li key={m.id} className={styles.mobileCard}>
              <p className={styles.mobileName}>{m.stockItem.material?.name ?? m.stockItem.product?.name}</p>
              <p className={styles.mobileMeta}>{moveType(t, m.type)} · {n("wh", m.warehouse.code, m.warehouse.name)}</p>
              <div className={styles.mobileQty}>
                <span className={styles.mobileQtyMain}>{qtyDisplay(m.qty)}</span>
                <span>{moneyDisplay(m.amount)} с</span>
              </div>
              <p className={styles.tdMuted}>{m.createdAt.toLocaleString(intlLocale(locale))}</p>
              {canAdjust && !m.reversedBy && m.type !== "REVERSAL" ? (
                <form action={reverseStockMovement} style={{ marginTop: 8 }}>
                  <input type="hidden" name="id" value={m.id} />
                  <IdempotencyField prefix={`rev-${m.id}`} />
                  <button className={styles.revBtn}>{t("wh.revBtn")}</button>
                </form>
              ) : m.reversedBy ? (
                <span className={styles.reversedTag}>{t("wh.reversed")}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
