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
import { ChevronRight } from "lucide-react";
import { ICON_STROKE } from "@/components/nav-icons";
import styles from "@/styles/premium.module.css";

export default async function MaterialsPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("materials.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [materials, units] = await Promise.all([
    prisma.material.findMany({ where: { archivedAt: null }, include: { storageUnit: true, purchaseUnit: true }, orderBy: { name: "asc" } }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("materials.title")}</h1>
          <p className={styles.subtitle}>{t("materials.hint")}</p>
        </div>
      </header>
      <CatalogNav current="materials" locale={locale} />

      {canManage ? (
        <section className={styles.section}>
          <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("materials.add")}</h2></div>
          <div className={styles.sectionBody}>
            <form action={createMaterial} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <p className="sm:col-span-2 lg:col-span-4 text-sm" style={{ color: "var(--ink-2)" }}>{t("materials.formHint")}</p>
              <FormField label={t("common.name")}><input name="name" required placeholder={t("materials.namePh")} className="ui-input" /></FormField>
              <FormField label={t("common.category")}><input name="category" required placeholder={t("materials.categoryPh")} className="ui-input" /></FormField>
              <FormField label={t("common.supplier")} hint={t("materials.supplierPh")}><input name="supplierName" placeholder={t("materials.supplierPh")} className="ui-input" /></FormField>
              <FormField label={t("materials.storageUnit")} hint={t("materials.storageHint")}>
                <AppSelect
                  name="storageUnitId"
                  defaultValue={units[0]?.id ?? ""}
                  options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                />
              </FormField>
              <FormField label={t("materials.purchaseUnit")} hint={t("materials.purchaseHint")}>
                <AppSelect
                  name="purchaseUnitId"
                  defaultValue={units[0]?.id ?? ""}
                  options={units.map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }))}
                />
              </FormField>
              <FormField label={t("materials.packWeight")} hint={t("materials.packWeightHint")}><input name="packageWeight" required inputMode="decimal" placeholder="25" className="ui-input" /></FormField>
              <FormField label={t("materials.packPrice")} hint={t("materials.packPriceHint")}><input name="packagePrice" required inputMode="decimal" placeholder="180" className="ui-input" /></FormField>
              <FormField label={t("materials.minStock")} hint={t("materials.minStockHint")}><input name="minStock" inputMode="decimal" placeholder="0" defaultValue="0" className="ui-input" /></FormField>
              <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-4" pendingLabel={t("common.sending")}>{t("materials.add")}</PendingButton>
            </form>
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("materials.title")}</h2></div>
        {materials.length === 0 ? (
          <div className={styles.empty}>{t("common.empty")}</div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr>
                  <th>{t("common.material")}</th>
                  <th>{t("materials.pack")}</th>
                  <th className={styles.thRight}>{t("materials.packPriceCol")}</th>
                  <th className={styles.thRight}>{t("materials.perUnit")}</th>
                  {canManage ? <th /> : null}
                </tr></thead>
                <tbody>
                  {materials.map((material) => {
                    const cost = unitCost(material.packagePrice, material.packageWeight);
                    return (
                      <tr key={material.id}>
                        <td>
                          <Link href={`/materials/${material.id}`} className={styles.tdLink}>{material.name}</Link>
                          <p className={styles.tdMuted}>{material.category}</p>
                        </td>
                        <td>{qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}</td>
                        <td className={styles.tdRight}>{moneyDisplay(material.packagePrice)} с</td>
                        <td className={styles.tdRight}>{cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}</td>
                        {canManage ? (
                          <td>
                            <form action={archiveMaterial}><input type="hidden" name="id" value={material.id} /><button className={styles.dangerBtn}>{t("common.archive")}</button></form>
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
                      <p className={styles.mobileMeta}>{material.category} · {qtyDisplay(material.packageWeight)} {material.storageUnit.symbol}</p>
                      <p className={styles.mobileRow}>{cost ? `${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : "—"}</p>
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
