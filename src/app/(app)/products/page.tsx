import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, canSeeMaterialCost } from "@core/auth/authz";
import { hasWorkerShell } from "@core/worker/worker-shell";
import { materialCostForRecipe } from "@core/costing/costing";
import { moneyDisplay } from "@core/shared/decimal";
import { archiveProduct } from "@/app/actions/products";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";
import photoStyles from "./products.module.css";

function ProductThumb({
  name,
  photoUrl,
  size = "card",
}: {
  name: string;
  photoUrl: string | null;
  size?: "card" | "table";
}) {
  const wrap = size === "table" ? photoStyles.tableThumb : photoStyles.thumb;
  const img = size === "table" ? photoStyles.tableThumbImg : photoStyles.thumbImg;
  return (
    <div className={wrap}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="" className={img} />
      ) : (
        <span className={photoStyles.thumbEmpty}>{name.slice(0, 1)}</span>
      )}
    </div>
  );
}

export default async function ProductsPage() {
  const { t } = await getTranslator();
  const session = await requirePermission("products.view");
  if (hasWorkerShell(session.user.roleCode, session.user.permissions ?? [])) redirect("/me");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("products.manage");
  const canSeeCost = canSeeMaterialCost(session.user.permissions, session.user.roleCode);

  const products = await prisma.product.findMany({
    where: { archivedAt: null },
    include: {
      saleUnit: true, outputUnit: true,
      prices: { where: { validTo: null }, take: 1 },
      recipe: canSeeCost ? { include: { versions: { where: { validTo: null }, include: { items: { include: { material: { include: { storageUnit: true } }, unit: true } } }, take: 1, orderBy: { versionNumber: "desc" as const } } } } : false,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("page.products")}</h1>
        </div>
        {canManage ? (
          <div className={styles.headerActions}>
            <Link href="/products/new" className={styles.primaryBtn} data-tour="products-new">{t("products.newTitle")}</Link>
          </div>
        ) : null}
      </header>

      <section className={styles.section} data-tour="products-list">
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("page.products")}</h2></div>
        {products.length === 0 ? (
          <div className={styles.empty}>{t("products.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th className={photoStyles.tableThumbCell} aria-hidden />
                  <th>{t("common.product")}</th>
                  <th>{t("common.unit")}</th>
                  <th className={styles.thRight}>{t("common.price")}</th>
                  {canSeeCost ? <th className={styles.thRight}>{t("products.matCost")}</th> : null}
                  <th>{t("products.output")}</th>
                  {canManage ? <th /> : null}
                </tr></thead>
                <tbody>
                  {products.map((product) => {
                    const version = product.recipe?.versions[0];
                    const cost = version ? materialCostForRecipe(version.items) : { total: null, missingPrices: true };
                    const price = product.prices[0]?.price;
                    return (
                      <tr key={product.id}>
                        <td className={photoStyles.tableThumbCell}>
                          <ProductThumb name={product.name} photoUrl={product.photoUrl} size="table" />
                        </td>
                        <td>
                          <Link href={`/products/${product.id}`} className={styles.tdLink}>{product.name}</Link>
                          <p className={styles.tdMuted}>{product.category}</p>
                        </td>
                        <td>{product.saleUnit.symbol}</td>
                        <td className={styles.tdRight}>{price ? `${moneyDisplay(price)} с` : "—"}</td>
                        {canSeeCost ? <td className={styles.tdRight}>{cost.total ? `${moneyDisplay(cost.total)} с` : t("products.incomplete")}</td> : null}
                        <td className={styles.tdMuted}>{product.outputPerBase.toString()} {product.outputUnit.symbol} / {product.recipeBaseQty.toString()} {product.saleUnit.symbol}</td>
                        {canManage ? (
                          <td><form action={archiveProduct}><input type="hidden" name="id" value={product.id} /><button className={styles.dangerBtn}>{t("common.archive")}</button></form></td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {products.map((product) => {
                const price = product.prices[0]?.price;
                return (
                  <li key={product.id}>
                    <Link href={`/products/${product.id}`} className={styles.mobileCard}>
                      <div className={photoStyles.cardInner}>
                        <ProductThumb name={product.name} photoUrl={product.photoUrl} />
                        <div className={photoStyles.cardBody}>
                          <div className={photoStyles.cardTop}>
                            <span className={styles.mobileName}>{product.name}</span>
                            <ChevronRight size={16} strokeWidth={ICON_STROKE} style={{ color: "var(--ink-3)", flexShrink: 0 }} />
                          </div>
                          <p className={styles.mobileMeta}>{product.category} · {product.saleUnit.symbol}</p>
                          <p className={styles.mobileRow}>{price ? `${moneyDisplay(price)} с` : "—"}</p>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
