import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { receiveOpening } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { getFgWarehouse } from "@/core/config/resolve-warehouse";
import { saleToOutputQty } from "@core/inventory/finished-goods";
import styles from "../warehouse.module.css";

export default async function FinishedWarehousePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive = session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const fg = await getFgWarehouse();
  const [items, products] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: fg.id, productId: { not: null } },
      include: { product: { include: { saleUnit: true, outputUnit: true } } },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.product.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("whNav.fg")}</h1>
          <p className={styles.subtitle}>{t("wh.fgHint")}</p>
        </div>
      </header>

      <WarehouseNav current="fg" locale={locale} />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("whNav.fg")}</h2>
        </div>
        {items.length === 0 ? (
          <div className={styles.sectionBody}>
            <p style={{ color: "var(--ink-3)", fontSize: 14 }}>{t("wh.fgEmpty")}</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("common.product")}</th>
                    <th className={styles.thRight}>{t("common.stock")}</th>
                    <th className={styles.thRight}>{t("common.reserve")}</th>
                    <th className={styles.thRight}>{t("common.available")}</th>
                    <th className={styles.thRight}>{t("common.cost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const onHand = D(String(item.qtyOnHand));
                    const reserved = D(String(item.qtyReserved));
                    return (
                      <tr key={item.id}>
                        <td data-label={t("common.product")}>
                          <span className={styles.tdBold}>{item.product?.name}</span>
                        </td>
                        <td className={styles.tdRight} data-label={t("common.stock")}>
                          {qtyDisplay(onHand)} {item.product?.saleUnit.symbol}
                          {item.product ? ` · ${qtyDisplay(saleToOutputQty(onHand, item.product.outputPerBase, item.product.recipeBaseQty))} ${item.product.outputUnit.symbol}` : ""}
                        </td>
                        <td className={styles.tdRight} data-label={t("common.reserve")}>{qtyDisplay(reserved)}</td>
                        <td className={styles.tdRight} data-label={t("common.available")}>{qtyDisplay(onHand.sub(reserved))}</td>
                        <td className={styles.tdRight} data-label={t("common.cost")}>{moneyDisplay(onHand.mul(item.wacUnitCost))} с</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {items.map((item) => {
                const onHand = D(String(item.qtyOnHand));
                const reserved = D(String(item.qtyReserved));
                return (
                  <li key={item.id} className={styles.mobileCard}>
                    <p className={styles.mobileName}>{item.product?.name}</p>
                    <div className={styles.mobileQty}>
                      <span className={styles.mobileQtyMain}>{qtyDisplay(onHand)} {item.product?.saleUnit.symbol}</span>
                      {reserved.gt(0) ? <span className={styles.mobileQtyReserve}>−{qtyDisplay(reserved)} {t("common.reserve").toLowerCase()}</span> : null}
                      <span className={styles.mobileQtyAvail}>{qtyDisplay(onHand.sub(reserved))} {t("common.available").toLowerCase()}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {canReceive ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("common.receipt")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={receiveOpening} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="warehouseId" value={fg.id} />
              <IdempotencyField prefix="fg-receive" />
              <FormField label={t("common.product")}>
                <select name="productId" className="ui-input">
                  {products.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </FormField>
              <FormField label={t("common.quantity")} required>
                <input name="quantity" required className="ui-input" />
              </FormField>
              <FormField label={t("common.unitPrice")} required>
                <input name="unitCost" required className="ui-input" />
              </FormField>
              <FormField label={t("common.comment")}>
                <input name="comment" className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>{t("common.receipt")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
