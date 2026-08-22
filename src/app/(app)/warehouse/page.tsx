import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { findFinishedGoodsWarehouse, findRawWarehouse } from "@/core/config/resolve-warehouse";
import { WarehouseMetrics } from "./warehouse-metrics";
import { Plus } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "./warehouse.module.css";

function shortProductName(name: string) {
  const quoted = name.match(/[«"]([^»"]+)[»"]/);
  if (quoted?.[1]?.trim()) return quoted[1].trim();
  const cleaned = name.replace(/^(декоративный\s+камень|цоколь|плитка)\s*/i, "").trim();
  const base = cleaned || name.trim();
  return base.length > 24 ? `${base.slice(0, 22)}…` : base;
}

export default async function WarehousePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const isWorker = session.user.roleCode === "worker";
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

  const sortedRows = isWorker
    ? [...productRows].sort((a, b) => Number(b.low) - Number(a.low))
    : productRows;

  return (
    <div className={styles.page}>
      <WarehouseMetrics items={metrics} activeId={activeId} />

      {!isWorker ? (
        <div className={styles.toolbar}>
          <p className={styles.toolbarHint}>
            {activeId === "products" ? t("wh.fgListHint") : t("wh.rawListHint")}
          </p>
          {canReceive ? (
            <Link href="/warehouse/add" className={styles.iconBtn} aria-label={t("wh.addMaterial")}>
              <Plus size={18} strokeWidth={ICON_STROKE} />
            </Link>
          ) : null}
        </div>
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
            <ul className={styles.productGrid}>
              {sortedRows.map(({ product, onHand, min, low, short }) => (
                <li key={product.id}>
                  {isWorker ? (
                    <div
                      className={`${styles.productCard} ${low ? styles.productCardLow : ""}`.trim()}
                    >
                      <div className={styles.productPhoto}>
                        {product.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.photoUrl} alt="" className={styles.productImg} />
                        ) : (
                          <span className={styles.productPhotoEmpty}>{product.name.slice(0, 1)}</span>
                        )}
                      </div>
                      <div className={styles.productBody}>
                        <p className={styles.productName}>{shortProductName(product.name)}</p>
                        <p className={styles.productStock}>
                          <strong>
                            {qtyDisplay(onHand)} {product.saleUnit.symbol}
                          </strong>
                        </p>
                        {min.gt(0) ? (
                          <p className={low ? styles.productNeed : styles.productMeta}>
                            {t("me.fgMin")}: {qtyDisplay(min)}
                            {low ? ` · ${t("me.fgNeed")} ${qtyDisplay(short)}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/products/${product.id}`}
                      className={`${styles.productCard} ${low ? styles.productCardLow : ""}`}
                    >
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
                        <p className={styles.productStock}>
                          {t("wh.fgOnHand")}:{" "}
                          <strong>
                            {qtyDisplay(onHand)} {product.saleUnit.symbol}
                          </strong>
                        </p>
                        {min.gt(0) ? (
                          <p className={low ? styles.productNeed : styles.productMeta}>
                            {t("me.fgMin")}: {qtyDisplay(min)}
                            {low ? ` · ${t("me.fgNeed")} ${qtyDisplay(short)}` : ""}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  )}
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
