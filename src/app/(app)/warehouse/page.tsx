import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { canSeeMaterialCost } from "@core/rbac/permissions";
import { qtyDisplay, moneyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "@/core/config/resolve-warehouse";
import { WarehouseMetrics } from "./warehouse-metrics";
import { Plus, ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import { shortProductLabel } from "@core/shared/format";
import styles from "./warehouse.module.css";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const isWorker = session.user.roleCode === "worker";
  const showCost = canSeeMaterialCost(session.user.permissions, session.user.roleCode);
  const canReceive = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const params = await searchParams;
  const activeId = isWorker ? "products" : params.view === "raw" ? "raw" : "products";

  const [fg, raw] = await Promise.all([
    findFinishedGoodsWarehouse(),
    isWorker ? Promise.resolve(null) : findRawWarehouse(),
  ]);

  if (!fg) {
    return (
      <div className={styles.page}>
        <p className={styles.emptyNote}>{t("wh.fgMissing")}</p>
      </div>
    );
  }

  const [products, materials] = await Promise.all([
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      include: {
        saleUnit: true,
        stockItems: { where: { warehouseId: fg.id } },
      },
      orderBy: { name: "asc" },
    }),
    raw
      ? prisma.material.findMany({
          where: { archivedAt: null, isActive: true },
          include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const productRows = products.map((p) => {
    const stock = p.stockItems[0];
    const onHand = D(String(stock?.qtyOnHand ?? 0));
    const min = D(String(p.minStock ?? 0));
    const max = D(String(p.maxStock ?? 0));
    const low = min.gt(0) && onHand.lt(min);
    const short = low ? min.sub(onHand) : D(0);
    const atLimit = max.gt(0) && onHand.gte(max);
    const wac = D(String(stock?.wacUnitCost ?? 0));
    const costTotal = onHand.mul(wac);
    return {
      product: p,
      onHand,
      min,
      max,
      low,
      short,
      atLimit,
      costTotal,
      unitCost: wac,
    };
  });

  const lowFgCount = productRows.filter((r) => r.low).length;
  const urgentMaterials = materials.filter((m) => {
    const stock = m.stockItems[0];
    return D(String(stock?.qtyOnHand ?? 0)).lt(m.minStock);
  });

  const metrics = isWorker
    ? [
        {
          id: "products",
          label: t("wh.kpiFgProducts"),
          value: String(lowFgCount),
          hint: lowFgCount > 0 ? t("wh.kpiFgLowHint", { n: String(lowFgCount) }) : t("wh.kpiFgOkHint"),
          tone: (lowFgCount > 0 ? "warn" : "green") as "warn" | "green",
          icon: "waiting" as const,
        },
      ]
    : [
        {
          id: "products",
          label: t("wh.kpiFgProducts"),
          value: String(products.length),
          hint: lowFgCount > 0 ? t("wh.kpiFgLowHint", { n: String(lowFgCount) }) : t("wh.kpiFgOkHint"),
          tone: (lowFgCount > 0 ? "warn" : "green") as "warn" | "green",
          icon: "waiting" as const,
        },
        {
          id: "raw",
          label: t("wh.kpiUrgentShortage"),
          value: String(urgentMaterials.length),
          hint: t("wh.kpiUrgentHint"),
          tone: "warn" as const,
          icon: "urgent" as const,
        },
      ];

  const sortedUrgent = [...urgentMaterials].sort((a, b) => {
    const aNeed = D(String(a.minStock)).sub(D(String(a.stockItems[0]?.qtyOnHand ?? 0)));
    const bNeed = D(String(b.minStock)).sub(D(String(b.stockItems[0]?.qtyOnHand ?? 0)));
    return bNeed.cmp(aNeed) || a.name.localeCompare(b.name, "ru");
  });

  const sortedRows = isWorker
    ? [...productRows].sort((a, b) => Number(b.low) - Number(a.low))
    : productRows;

  return (
    <div className={styles.page}>
      <WarehouseMetrics items={metrics} activeId={activeId} />

      {!isWorker ? (
        <p className={styles.toolbarHint}>
          {activeId === "products" ? t("wh.fgListHint") : t("wh.rawListHint")}
        </p>
      ) : (
        <p className={styles.toolbarHint}>{t("me.fgHint")}</p>
      )}

      {activeId === "products" ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.fgTitle")}</h2>
            {isWorker ? (
              <Link href="/me" className={styles.ghostLink}>
                {t("me.fgAddShort")} →
              </Link>
            ) : null}
          </div>
          {sortedRows.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("me.fgEmptyProducts")}</p>
            </div>
          ) : (
            <ul className={styles.fgList}>
              {sortedRows.map(({ product, onHand, low, costTotal, unitCost }) => {
                const cardClass = `${styles.fgCard} ${low ? styles.fgCardLow : ""}`.trim();
                const cardBody = (
                  <>
                    <div className={styles.fgCardRow}>
                      <div className={styles.fgPhoto}>
                        {product.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.photoUrl} alt="" className={styles.fgImg} />
                        ) : (
                          <span className={styles.fgPhotoEmpty}>{product.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className={styles.fgBody}>
                        <p className={styles.fgName} title={product.name}>
                          {shortProductLabel(product.name)}
                        </p>
                      </div>
                    </div>
                    <div className={showCost ? styles.fgStats : styles.fgStatsSingle}>
                      <div className={styles.fgStat}>
                        <span className={styles.fgStatLabel}>{t("common.stock")}</span>
                        <span className={styles.fgStatQty}>
                          {qtyDisplay(onHand)} {product.saleUnit.symbol}
                        </span>
                      </div>
                      {showCost ? (
                        <>
                          <div className={styles.fgStat}>
                            <span className={styles.fgStatLabel}>{t("wh.costPerM2")}</span>
                            <span className={styles.fgStatCostUnit}>
                              {moneyDisplay(unitCost)} с/{product.saleUnit.symbol}
                            </span>
                          </div>
                          <div className={styles.fgStat}>
                            <span className={styles.fgStatLabel}>{t("wh.costTotalSum")}</span>
                            <span className={styles.fgStatCostTotal}>
                              {moneyDisplay(costTotal)} с
                            </span>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </>
                );

                return (
                  <li key={product.id}>
                    {isWorker ? (
                      <div className={cardClass}>{cardBody}</div>
                    ) : (
                      <Link href={`/products/${product.id}`} className={cardClass}>
                        {cardBody}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.urgentList")}</h2>
            {canReceive ? (
              <Link href="/warehouse/add" className={styles.sectionAddBtn}>
                <Plus size={16} strokeWidth={ICON_STROKE} aria-hidden />
                {t("wh.addMaterial")}
              </Link>
            ) : null}
          </div>
          {sortedUrgent.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("wh.urgentEmpty")}</p>
            </div>
          ) : (
            <ul className={styles.rawList}>
              {sortedUrgent.map((material) => {
                const stock = material.stockItems[0];
                const onHand = D(String(stock?.qtyOnHand ?? 0));
                const min = D(String(material.minStock));
                const need = min.sub(onHand);
                const unit = material.storageUnit.symbol;
                const addHref = `/warehouse/add?material=${material.id}&qty=${encodeURIComponent(qtyDisplay(need))}`;
                return (
                  <li key={material.id}>
                    <Link href={addHref} className={styles.rawCard}>
                      <p className={styles.rawName}>{material.name}</p>
                      <div className={styles.rawStats}>
                        <div className={styles.rawStat}>
                          <span className={styles.rawStatLabel}>{t("wh.urgentOnHand")}</span>
                          <span className={styles.rawStatValue}>
                            {qtyDisplay(onHand)} {unit}
                          </span>
                        </div>
                        <div className={styles.rawStat}>
                          <span className={styles.rawStatLabel}>{t("wh.urgentMin")}</span>
                          <span className={styles.rawStatValue}>
                            {qtyDisplay(min)} {unit}
                          </span>
                        </div>
                        <div className={styles.rawStat}>
                          <span className={styles.rawStatLabel}>{t("wh.urgentNeed")}</span>
                          <span className={styles.rawStatNeed}>
                            {qtyDisplay(need)} {unit}
                          </span>
                        </div>
                      </div>
                      <span className={styles.rawAction}>
                        {t("wh.urgentReceiveBtn")}
                        <ChevronRight size={14} strokeWidth={ICON_STROKE} aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
