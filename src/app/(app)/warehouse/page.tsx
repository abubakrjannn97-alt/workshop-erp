import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { receiveOpening, transferWarehouse, writeOffStock } from "@/app/actions/inventory";
import { createPurchaseFromShortage } from "@/app/actions/purchasing";
import { RevealList } from "@/components/reveal-list";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { getRawWarehouse, resolveRawWarehouseCode } from "@/core/config/resolve-warehouse";
import Link from "next/link";
import styles from "./warehouse.module.css";

export default async function WarehousePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive = session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const canAdjust = session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const canBuy = session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");

  const raw = await getRawWarehouse();
  const rawCode = await resolveRawWarehouseCode();

  const [items, materials, suppliers, warehouses] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: raw.id, materialId: { not: null } },
      include: { material: { include: { storageUnit: true } } },
      orderBy: { material: { name: "asc" } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
  ]);

  const totalPositions = materials.length;
  const lowCount = materials.filter((m) => {
    const stock = m.stockItems[0];
    return D(String(stock?.qtyOnHand ?? 0)).lte(m.minStock);
  }).length;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("wh.rawTitle")}</h1>
          <p className={styles.subtitle}>{t("wh.rawHint")}</p>
        </div>
        <div className={styles.headerActions}>
          <Link href={`/warehouse/print?warehouse=${rawCode}`} className={styles.ghostLink}>{t("wh.printStock")}</Link>
        </div>
      </header>

      <WarehouseNav current="raw" locale={locale} />

      <div className={styles.summary}>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("common.material")}</p>
          <p className={styles.summaryValue}>{totalPositions}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("common.stock")}</p>
          <p className={styles.summaryValue}>{items.length}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("wh.belowMin")}</p>
          <p className={lowCount > 0 ? styles.summaryValueWarn : styles.summaryValue}>{lowCount}</p>
        </div>
        <div className={styles.summaryBox}>
          <p className={styles.summaryLabel}>{t("common.reserve")}</p>
          <p className={styles.summaryValue}>{items.filter((i) => D(String(i.qtyReserved)).gt(0)).length}</p>
        </div>
      </div>

      <section className={styles.section} data-tour="warehouse-stock">
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t("common.stock")}</h2>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t("common.material")}</th>
                <th className={styles.thRight}>{t("common.stock")}</th>
                <th className={styles.thRight}>{t("common.reserve")}</th>
                <th className={styles.thRight}>{t("common.available")}</th>
                <th className={styles.thRight}>{t("common.cost")}</th>
                <th className={styles.thRight}>{t("common.min")}</th>
                <th />
              </tr>
            </thead>
            <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={10}>
              {materials.map((material) => {
                const stock = material.stockItems[0];
                const onHand = D(String(stock?.qtyOnHand ?? 0));
                const reserved = D(String(stock?.qtyReserved ?? 0));
                const avail = onHand.sub(reserved);
                const value = onHand.mul(stock?.wacUnitCost ?? 0);
                const low = onHand.lte(material.minStock);
                return (
                  <tr key={material.id}>
                    <td data-label={t("common.material")}>
                      <span className={styles.tdBold}>{material.name}</span>
                      {low ? <p className={styles.tdWarn}>{t("wh.belowMin")}</p> : null}
                    </td>
                    <td className={styles.tdRight} data-label={t("common.stock")}>{qtyDisplay(onHand)} {material.storageUnit.symbol}</td>
                    <td className={styles.tdRight} data-label={t("common.reserve")}>{qtyDisplay(reserved)}</td>
                    <td className={styles.tdRight} data-label={t("common.available")}>{qtyDisplay(avail)}</td>
                    <td className={styles.tdRight} data-label={t("common.cost")}>{moneyDisplay(value)} с</td>
                    <td className={styles.tdRight} data-label={t("common.min")}>{qtyDisplay(material.minStock)} {material.storageUnit.symbol}</td>
                    <td className={styles.tdAction}>
                      {canBuy && low && suppliers[0] ? (
                        <form action={createPurchaseFromShortage}>
                          <input type="hidden" name="supplierId" value={suppliers[0].id} />
                          <input type="hidden" name="materialId" value={material.id} />
                          <input type="hidden" name="quantity" value={D(String(material.minStock)).sub(onHand).abs().toFixed(6)} />
                          <button className={styles.actionBtn}>{t("wh.poRequest")}</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </RevealList>
          </table>
        </div>
        <ul className={styles.mobileList}>
          {materials.map((material) => {
            const stock = material.stockItems[0];
            const onHand = D(String(stock?.qtyOnHand ?? 0));
            const reserved = D(String(stock?.qtyReserved ?? 0));
            const avail = onHand.sub(reserved);
            const low = onHand.lte(material.minStock);
            return (
              <li key={material.id} className={styles.mobileCard}>
                <p className={styles.mobileName}>{material.name}</p>
                {low ? <p className={styles.tdWarn}>{t("wh.belowMin")}</p> : null}
                <div className={styles.mobileQty}>
                  <span className={styles.mobileQtyMain}>{qtyDisplay(onHand)} {material.storageUnit.symbol}</span>
                  {reserved.gt(0) ? <span className={styles.mobileQtyReserve}>−{qtyDisplay(reserved)} {t("common.reserve").toLowerCase()}</span> : null}
                  <span className={styles.mobileQtyAvail}>{qtyDisplay(avail)} {t("common.available").toLowerCase()}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {canReceive ? (
        <section className={styles.section} data-tour="warehouse-in">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("common.receipt")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={receiveOpening} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="warehouseId" value={raw.id} />
              <IdempotencyField prefix="wh-in" />
              <FormField label={t("common.material")}>
                <select name="materialId" className="ui-input">
                  {materials.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
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

      {canAdjust ? (
        <section className={styles.section} data-tour="warehouse-out">
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("common.writeOff")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={writeOffStock} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="warehouseId" value={raw.id} />
              <IdempotencyField prefix="wh-out" />
              <FormField label={t("common.material")}>
                <select name="materialId" className="ui-input">
                  {materials.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </FormField>
              <FormField label={t("wh.writeQty")} required>
                <input name="quantity" required className="ui-input" />
              </FormField>
              <FormField label={t("common.reason")} required>
                <input name="reason" required className="ui-input" />
              </FormField>
              <FormField label={t("common.comment")}>
                <input name="comment" className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-danger min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>{t("common.writeOff")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      {canAdjust ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.transfer")}</h2>
          </div>
          <div className={styles.sectionBody}>
            <form action={transferWarehouse} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input type="hidden" name="fromWarehouseId" value={raw.id} />
              <IdempotencyField prefix="wh-tr" />
              <FormField label={t("wh.toWarehouse")}>
                <select name="toWarehouseId" className="ui-input">
                  {warehouses.filter((w) => w.id !== raw.id).map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                </select>
              </FormField>
              <FormField label={t("common.material")}>
                <select name="materialId" className="ui-input">
                  {materials.map((m) => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
              </FormField>
              <FormField label={t("common.quantity")} required>
                <input name="quantity" required className="ui-input" />
              </FormField>
              <FormField label={t("common.comment")}>
                <input name="comment" className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>{t("wh.transfer")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
