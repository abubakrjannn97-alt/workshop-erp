import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { CatalogNav } from "@/components/catalog-nav";
import { createMaterial, archiveMaterial } from "@/app/actions/materials";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { unitCost } from "@core/costing/costing";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { FirstVisitTips } from "@/components/first-visit-tips";
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

export default async function MaterialsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("materials.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [materials, units] = await Promise.all([
    prisma.material.findMany({
      where: { archivedAt: null },
      include: { storageUnit: true, purchaseUnit: true },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("materials.title")}</h1>
        </div>
      </header>
      <CatalogNav current="materials" locale={locale} />

      {canManage ? (
        <section className={styles.section}>
          <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}>
            <h2 className={styles.sectionTitle}>{t("materials.add")}</h2>
          </div>
          <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
            <FirstVisitTips
              locale={locale}
              storageKey="tips:materials-add"
              tips={[
                t("materials.storageHint"),
                t("materials.purchaseHint"),
                t("materials.packWeightHint"),
                t("materials.packPriceHint"),
              ]}
            />
            <form action={createMaterial} className={catalogStyles.formGrid}>
              <FormField label={t("common.name")} required>
                <input name="name" required className="ui-input" />
              </FormField>
              <FormField label={t("common.category")} required>
                <input name="category" required className="ui-input" />
              </FormField>
              <FormField label={t("common.supplier")}>
                <input name="supplierName" className="ui-input" />
              </FormField>
              <FormField label={t("materials.minStock")}>
                <input name="minStock" inputMode="decimal" defaultValue="0" className="ui-input" />
              </FormField>
              <FormField label={t("materials.storageUnit")}>
                <AppSelect
                  name="storageUnitId"
                  defaultValue={units[0]?.id ?? ""}
                  options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                />
              </FormField>
              <FormField label={t("materials.purchaseUnit")}>
                <AppSelect
                  name="purchaseUnitId"
                  defaultValue={units[0]?.id ?? ""}
                  options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                />
              </FormField>
              <FormField label={t("materials.packWeight")} required>
                <input name="packageWeight" required inputMode="decimal" className="ui-input" />
              </FormField>
              <FormField label={t("materials.packPrice")} required>
                <input name="packagePrice" required inputMode="decimal" className="ui-input" />
              </FormField>
              <PendingButton
                className={`${catalogStyles.formFull} ui-btn-primary min-h-[44px]`}
                pendingLabel={t("common.sending")}
              >
                {t("materials.add")}
              </PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}>
          <h2 className={styles.sectionTitle}>{t("materials.title")}</h2>
        </div>
        {materials.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t("common.material")}</th>
                    <th>{t("materials.pack")}</th>
                    <th className={styles.thRight}>{t("materials.packPriceCol")}</th>
                    <th className={styles.thRight}>{t("materials.perUnit")}</th>
                    {canManage ? <th /> : null}
                  </tr>
                </thead>
                <tbody>
                  {materials.map((material) => {
                    const cost = unitCost(material.packagePrice, material.packageWeight);
                    return (
                      <tr key={material.id}>
                        <td>
                          <Link href={`/materials/${material.id}`} className={styles.tdLink}>
                            {material.name}
                          </Link>
                          <p className={styles.tdMuted}>{material.category}</p>
                        </td>
                        <td>
                          {qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}
                        </td>
                        <td className={styles.tdRight}>{moneyDisplay(material.packagePrice)} с</td>
                        <td className={styles.tdRight}>
                          {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}
                        </td>
                        {canManage ? (
                          <td>
                            <form action={archiveMaterial}>
                              <input type="hidden" name="id" value={material.id} />
                              <button className={styles.dangerBtn}>{t("common.archive")}</button>
                            </form>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ul className={styles.mobileList}>
              {materials.map((material) => {
                const cost = unitCost(material.packagePrice, material.packageWeight);
                return (
                  <li key={material.id}>
                    <Link href={`/materials/${material.id}`} className={styles.mobileCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className={styles.mobileName}>{material.name}</span>
                        <ChevronRight size={16} strokeWidth={ICON_STROKE} style={{ color: "var(--ink-3)" }} />
                      </div>
                      <p className={styles.mobileMeta}>
                        {material.category} · {qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}
                      </p>
                      <p className={styles.mobileRow}>
                        {cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}
                      </p>
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
