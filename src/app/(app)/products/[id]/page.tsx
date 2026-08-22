import { getTranslator } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, canSeeMaterialCost } from "@core/auth/authz";
import { updateProduct } from "@/app/actions/products";
import { materialCostForRecipe } from "@core/costing/costing";
import { D } from "@core/shared/decimal";
import { RecipeEditor } from "./recipe-editor";
import { NeedPreview } from "./need-preview";
import { FoldSection } from "./fold-section";
import { FormField } from "@/components/form-field";
import { HeaderBackButton } from "@/components/header-back-button";
import { AppSelect } from "@/components/app-select";
import Link from "next/link";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

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
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
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

      <section className={styles.section}>
        <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}>
          <h2 className={styles.sectionTitle}>{t("products.paramsTitle")}</h2>
        </div>
        <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
          <form action={updateProduct} className={catalogStyles.paramForm} data-tour="products-form">
            <input type="hidden" name="id" value={product.id} />
            <div className={`${catalogStyles.paramGroup} ${catalogStyles.paramGroupMain}`}>
              <p className={catalogStyles.paramGroupTitle}>{t("products.groupBasic")}</p>
              <div className={catalogStyles.paramRow}>
                <FormField label={t("common.name")}>
                  <input name="name" defaultValue={product.name} disabled={!canManage} maxLength={40} className="ui-input" />
                </FormField>
                <FormField label={t("common.category")}>
                  <input name="category" defaultValue={product.category} disabled={!canManage} className="ui-input" />
                </FormField>
              </div>
            </div>

            <div className={`${catalogStyles.paramGroup} ${catalogStyles.paramGroupMake}`}>
              <p className={catalogStyles.paramGroupTitle}>{t("products.groupMake")}</p>
              <div className={catalogStyles.paramRow}>
                <FormField label={t("products.saleUnitSimple")}>
                  <AppSelect
                    name="saleUnitId"
                    defaultValue={product.saleUnitId}
                    disabled={!canManage}
                    options={units.map((u) => ({ value: u.id, label: u.symbol }))}
                  />
                </FormField>
                <FormField label={t("products.fgUnitSimple")}>
                  <AppSelect
                    name="outputUnitId"
                    defaultValue={product.outputUnitId}
                    disabled={!canManage}
                    options={units.map((u) => ({ value: u.id, label: u.symbol }))}
                  />
                </FormField>
              </div>
              <div className={catalogStyles.paramRow}>
                <FormField label={t("products.recipeBaseSimple")}>
                  <input
                    name="recipeBaseQty"
                    defaultValue={product.recipeBaseQty.toString()}
                    disabled={!canManage}
                    placeholder="1"
                    className="ui-input"
                    inputMode="decimal"
                  />
                </FormField>
                <FormField label={t("products.outputSimple")}>
                  <input
                    name="outputPerBase"
                    defaultValue={product.outputPerBase.toString()}
                    disabled={!canManage}
                    placeholder="1"
                    className="ui-input"
                    inputMode="decimal"
                  />
                </FormField>
              </div>
            </div>

            <div className={`${catalogStyles.paramGroup} ${catalogStyles.paramGroupStock}`}>
              <p className={catalogStyles.paramGroupTitle}>{t("products.groupStock")}</p>
              <input type="hidden" name="maxStock" value={product.maxStock.toString()} />
              <div className={`${catalogStyles.paramRow} ${catalogStyles.paramRowOne}`}>
                <FormField label={t("products.salePriceShort")}>
                  <input
                    name="price"
                    defaultValue={currentPrice?.price.toString() ?? "0"}
                    disabled={!canManage}
                    placeholder="0"
                    className="ui-input"
                    inputMode="decimal"
                  />
                </FormField>
              </div>
              <div className={catalogStyles.paramRow}>
                <FormField label={t("products.laborRate")}>
                  <input
                    name="laborRate"
                    defaultValue={product.laborRate.toString()}
                    disabled={!canManage}
                    placeholder="0"
                    className="ui-input"
                    inputMode="decimal"
                  />
                </FormField>
                <FormField label={t("products.minStockSimple")}>
                  <input
                    name="minStock"
                    defaultValue={product.minStock.toString()}
                    disabled={!canManage}
                    placeholder="0"
                    className="ui-input"
                    inputMode="decimal"
                  />
                </FormField>
              </div>
            </div>

            {canManage ? (
              <button type="submit" className={`${catalogStyles.paramSave} ui-btn-primary`}>
                {t("products.saveParams")}
              </button>
            ) : null}
          </form>
        </div>
      </section>

      {cost || D(String(product.laborRate)).gt(0) ? (
        <FoldSection title={t("products.costPerM2", { u: product.saleUnit.symbol })}>
          <NeedPreview
            hideTitle
            lines={(cost?.lines ?? []).map((l) => ({
              materialName: l.materialName,
              quantity: l.quantity,
              unitSymbol: l.unitSymbol,
              lineCost: canSeeCost ? l.lineCost : null,
            }))}
            saleSymbol={product.saleUnit.symbol}
            recipeBaseQty={product.recipeBaseQty.toString()}
            laborRate={product.laborRate.toString()}
            locale={locale}
            showCosts={canSeeCost}
          />
        </FoldSection>
      ) : null}

      <FoldSection title={t("products.recipe")}>
        {canRecipe ? (
          <RecipeEditor
            productId={product.id}
            materials={materials.map((m) => ({ id: m.id, name: m.name }))}
            units={units.map((u) => ({ id: u.id, name: u.name, extra: u.symbol }))}
            initial={currentVersion?.items.map((item) => ({ materialId: item.materialId, quantity: item.quantity.toString(), unitId: item.unitId })) ?? []}
            locale={locale}
          />
        ) : null}
      </FoldSection>
    </div>
  );
}
