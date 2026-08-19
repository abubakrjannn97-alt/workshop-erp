import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, canSeeMaterialCost } from "@core/auth/authz";
import { updateProduct } from "@/app/actions/products";
import { CatalogNav } from "@/components/catalog-nav";
import { materialCostForRecipe } from "@core/costing/costing";
import { moneyDisplay } from "@core/shared/decimal";
import { RecipeEditor } from "./recipe-editor";
import { NeedPreview } from "./need-preview";
import { FormField } from "@/components/form-field";
import { HeaderBackButton } from "@/components/header-back-button";
import Link from "next/link";
import styles from "@/styles/premium.module.css";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const { id } = await params;
  const session = await requirePermission("products.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("products.manage");
  const canRecipe = session.user.roleCode === "owner" || session.user.permissions.includes("recipes.manage");
  const canSeeCost = canSeeMaterialCost(session.user.permissions, session.user.roleCode);

  const [product, units, materials] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        saleUnit: true, outputUnit: true,
        prices: { orderBy: { validFrom: "desc" } },
        recipe: { include: { versions: { orderBy: { versionNumber: "desc" }, include: { items: { include: { material: { include: { storageUnit: true } }, unit: true } } } } } },
      },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!product || product.archivedAt) notFound();

  const currentPrice = product.prices.find((p) => !p.validTo);
  const currentVersion = product.recipe?.versions.find((v) => !v.validTo) ?? product.recipe?.versions[0];
  const cost = currentVersion ? materialCostForRecipe(currentVersion.items) : null;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} />
          <div className={styles.headerText}>
          <p style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent)" }}>{t("common.product")}</p>
          <h1 className={styles.title}>{product.name}</h1>
        </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/products" className={styles.ghostLink}>{t("page.products")}</Link>
        </div>
      </header>
      <CatalogNav current="products" locale={locale} />

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("common.settings")}</h2></div>
        <div className={styles.sectionBody}>
          <form action={updateProduct} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="id" value={product.id} />
            <FormField label={t("common.name")}><input name="name" defaultValue={product.name} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("common.category")}><input name="category" defaultValue={product.category} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("products.saleUnit")}>
              <select name="saleUnitId" defaultValue={product.saleUnitId} disabled={!canManage} className="ui-input">{units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}</select>
            </FormField>
            <FormField label={t("products.fgUnit")}>
              <select name="outputUnitId" defaultValue={product.outputUnitId} disabled={!canManage} className="ui-input">{units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}</select>
            </FormField>
            <FormField label={t("products.recipeBaseShort")}><input name="recipeBaseQty" defaultValue={product.recipeBaseQty.toString()} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("products.outputBaseShort")}><input name="outputPerBase" defaultValue={product.outputPerBase.toString()} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("products.salePrice")}><input name="price" defaultValue={currentPrice?.price.toString() ?? "0"} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("products.minPrice")}><input name="minPrice" defaultValue={product.minPrice.toString()} disabled={!canManage} className="ui-input" /></FormField>
            {canManage ? <button className="sm:col-span-2 ui-btn-primary min-h-[44px]">{t("products.savePriceHist")}</button> : null}
          </form>
        </div>
      </section>

      {canSeeCost ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("products.matCostTitle")}</h2></div>
          <div className={styles.sectionBody}>
            <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 12px" }}>{t("products.matCostHint")}</p>
            {cost ? (
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {cost.lines.map((line) => (
                  <li key={line.materialId} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                    <span style={{ color: "var(--ink-2)" }}>
                      {line.materialName}: {line.quantity} {line.unitSymbol}
                      {line.warning ? <span style={{ marginLeft: 8, fontSize: 11, color: "var(--warn)" }}>{line.warning}</span> : null}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{line.lineCost ? `${moneyDisplay(line.lineCost)} с` : "—"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>{t("products.noRecipe")}</p>
            )}
            <p style={{ marginTop: 14, fontSize: 14, fontWeight: 600 }}>
              {t("products.totalOn")} {product.recipeBaseQty.toString()} {product.saleUnit.symbol}: {cost?.total ? `${moneyDisplay(cost.total)} с` : t("products.costUnset")}
            </p>
          </div>
        </section>
      ) : null}

      {cost ? (
        <NeedPreview
          lines={cost.lines.map((l) => ({ materialName: l.materialName, quantity: l.quantity, unitSymbol: l.unitSymbol, lineCost: canSeeCost ? l.lineCost : null }))}
          outputPerBase={product.outputPerBase.toString()}
          outputSymbol={product.outputUnit.symbol}
          saleSymbol={product.saleUnit.symbol}
          recipeBaseQty={product.recipeBaseQty.toString()}
          locale={locale}
          showCosts={canSeeCost}
        />
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("products.recipe")}</h2></div>
        <div className={styles.sectionBody}>
          <p style={{ fontSize: 12, color: "var(--ink-3)", margin: "0 0 8px" }}>{t("products.recipeHint")}</p>
          {currentVersion ? (
            <p style={{ fontSize: 13, color: "var(--ink-2)" }}>{t("products.currentVer")}: V{currentVersion.versionNumber} · {currentVersion.validFrom.toLocaleDateString(intlLocale(locale))}</p>
          ) : null}
          {canRecipe ? (
            <div style={{ marginTop: 14 }}>
              <RecipeEditor
                productId={product.id}
                materials={materials.map((m) => ({ id: m.id, name: m.name }))}
                units={units.map((u) => ({ id: u.id, name: u.name, extra: u.symbol }))}
                initial={currentVersion?.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity.toString(), unitId: item.unitId })) ?? []}
                locale={locale}
              />
            </div>
          ) : null}
          <div style={{ marginTop: 20 }}>
            {product.recipe?.versions.map((version) => (
              <div key={version.id} style={{ padding: "8px 12px", marginBottom: 6, borderRadius: 8, background: "var(--surface-2)", fontSize: 12, color: "var(--ink-3)" }}>
                V{version.versionNumber}: {version.validFrom.toLocaleDateString(intlLocale(locale))}
                {version.validTo ? ` — ${version.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`}
                {version.comment ? ` · ${version.comment}` : ""}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("products.priceHistory")}</h2></div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {product.prices.map((row) => (
              <li key={row.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ color: "var(--ink-2)" }}>
                  {row.validFrom.toLocaleDateString(intlLocale(locale))}
                  {row.validTo ? ` — ${row.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`}
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600 }}>{moneyDisplay(row.price)} с</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
