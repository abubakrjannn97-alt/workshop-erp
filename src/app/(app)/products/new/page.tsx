import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { getDomainConfig } from "@core/config/domain-config";
import { unitCost } from "@core/costing/costing";
import { ProductCreateWizard } from "../product-wizard";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

export default async function NewProductPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("products.manage");
  const [units, materials, domainConfig] = await Promise.all([
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true },
      orderBy: { name: "asc" },
    }),
    getDomainConfig(),
  ]);
  const defaultSaleUnitId = units.find((u) => u.code === domainConfig.product.defaultSaleUnit)?.id ?? units[0]?.id ?? "";
  const defaultOutputUnitId =
    units.find((u) => u.code === domainConfig.product.defaultOutputUnit)?.id ?? units[0]?.id ?? "";

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("products.newTitle")}</h1>
        </div>
      </header>
      <section className={styles.section} data-tour="products-form">
        <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
          <ProductCreateWizard
            locale={locale}
            units={units.map((u) => ({ id: u.id, name: u.name, symbol: u.symbol }))}
            materials={materials.map((m) => {
              const cost = unitCost(m.packagePrice, m.packageWeight);
              return {
                id: m.id,
                name: m.name,
                unitCost: cost ? cost.toFixed(4) : null,
                packageWeight: String(m.packageWeight),
                storageUnitId: m.storageUnitId,
                storageSymbol: m.storageUnit.symbol,
              };
            })}
            defaults={{
              category: domainConfig.product.defaultCategory,
              saleUnitId: defaultSaleUnitId,
              outputUnitId: defaultOutputUnitId,
              recipeBaseQty: "1",
              outputPerBase: String(domainConfig.product.defaultOutputPerBase),
            }}
          />
        </div>
      </section>
    </div>
  );
}
