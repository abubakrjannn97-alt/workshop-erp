import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { getFgWarehouse, getRawWarehouse } from "@/core/config/resolve-warehouse";
import { WarehouseMetrics } from "./warehouse-metrics";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./warehouse.module.css";

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const params = await searchParams;
  const activeId = params.view === "raw" ? "raw" : "products";

  const [fg, raw] = await Promise.all([getFgWarehouse(), getRawWarehouse()]);

  const [products, materials] = await Promise.all([
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      include: {
        saleUnit: true,
        stockItems: { where: { warehouseId: fg.id } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const productRows = products.map((p) => {
    const onHand = D(String(p.stockItems[0]?.qtyOnHand ?? 0));
    const min = D(String(p.minStock ?? 0));
    const max = D(String(p.maxStock ?? 0));
    const low = min.gt(0) && onHand.lt(min);
    const short = low ? min.sub(onHand) : D(0);
    const atLimit = max.gt(0) && onHand.gte(max);
    return { product: p, onHand, min, max, low, short, atLimit };
  });

  const lowFgCount = productRows.filter((r) => r.low).length;
  const urgentMaterials = materials.filter((m) => {
    const stock = m.stockItems[0];
    return D(String(stock?.qtyOnHand ?? 0)).lt(m.minStock);
  });

  const metrics = [
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

  return (
    <div className={styles.page}>
      <WarehouseMetrics items={metrics} activeId={activeId} />

      <div className={styles.toolbar}>
        <p className={styles.toolbarHint}>
          {activeId === "products" ? t("wh.fgListHint") : t("wh.rawListHint")}
        </p>
        {canReceive ? (
          <Link
            href="/warehouse/add"
            className={styles.iconBtn}
            aria-label={t("wh.addMaterial")}
          >
            <Plus size={18} strokeWidth={ICON_STROKE} />
          </Link>
        ) : null}
      </div>

      {activeId === "products" ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.fgTitle")}</h2>
          </div>
          {productRows.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("me.fgEmptyProducts")}</p>
            </div>
          ) : (
            <ul className={styles.productGrid}>
              {productRows.map(({ product, onHand, min, max, low, short, atLimit }) => (
                <li key={product.id}>
                  <Link href={`/products/${product.id}`} className={`${styles.productCard} ${low ? styles.productCardLow : ""} ${atLimit ? styles.productCardOk : ""}`}>
                    <div className={styles.productPhoto}>
                      {product.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={product.photoUrl} alt="" className={styles.productImg} />
                      ) : (
                        <span className={styles.productPhotoEmpty}>{product.name.slice(0, 1)}</span>
                      )}
                    </div>
                    <div className={styles.productBody}>
                      <p className={styles.productName}>{product.name}</p>
                      <p className={styles.productUnit}>
                        {product.saleUnit.name} · {product.saleUnit.symbol}
                      </p>
                      <p className={styles.productStock}>
                        {t("wh.fgOnHand")}:{" "}
                        <strong>
                          {qtyDisplay(onHand)} {product.saleUnit.symbol}
                        </strong>
                      </p>
                      {min.gt(0) ? (
                        <p className={low ? styles.productNeed : styles.productMeta}>
                          {t("me.fgMin")}: {qtyDisplay(min)} {product.saleUnit.symbol}
                          {low ? ` · ${t("me.fgNeed")} ${qtyDisplay(short)}` : ""}
                        </p>
                      ) : null}
                      {max.gt(0) ? (
                        <p className={atLimit ? styles.productLimitOk : styles.productMeta}>
                          {t("wh.fgLimit")}: {qtyDisplay(max)} {product.saleUnit.symbol}
                          {atLimit ? ` · ${t("wh.fgLimitReached")}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{t("wh.urgentList")}</h2>
          </div>
          {urgentMaterials.length === 0 ? (
            <div className={styles.sectionBody}>
              <p className={styles.emptyNote}>{t("common.empty")}</p>
            </div>
          ) : (
            <ul className={styles.alertList}>
              {urgentMaterials.map((material) => {
                const stock = material.stockItems[0];
                const onHand = D(String(stock?.qtyOnHand ?? 0));
                const need = D(String(material.minStock)).sub(onHand);
                return (
                  <li key={material.id}>
                    <Link href="/warehouse/add" className={styles.alertItemLink}>
                      <div className={styles.alertMain}>
                        <p className={styles.alertName}>{material.name}</p>
                        <p className={styles.alertMeta}>
                          {qtyDisplay(onHand)} / {qtyDisplay(material.minStock)} {material.storageUnit.symbol}
                          {need.gt(0) ? ` · −${qtyDisplay(need)}` : null}
                        </p>
                        <p className={styles.alertHint}>{t("wh.urgentAddHint")}</p>
                      </div>
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
