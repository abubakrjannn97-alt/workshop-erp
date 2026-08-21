import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { updateMaterial } from "@/app/actions/materials";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { unitCost } from "@core/costing/costing";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { HeaderBackButton } from "@/components/header-back-button";
import { AppSelect } from "@/components/app-select";
import Link from "next/link";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

export default async function MaterialDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale } = await getTranslator();
  const { id } = await params;
  const session = await requirePermission("materials.view");
  const canManage = session.user.roleCode === "owner" || session.user.permissions.includes("materials.manage");

  const [material, units] = await Promise.all([
    prisma.material.findUnique({ where: { id }, include: { storageUnit: true, purchaseUnit: true, prices: { orderBy: { validFrom: "desc" } } } }),
    prisma.unit.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);
  if (!material || material.archivedAt) notFound();

  const cost = unitCost(material.packagePrice, material.packageWeight);

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerLead}>
          <HeaderBackButton locale={locale} />
          <div className={styles.headerText}>
          <h1 className={styles.title}>{material.name}</h1>
          <p className={styles.subtitle}>{cost ? `${t("materials.calcCost")}: ${moneyDisplay(cost)} с / ${material.storageUnit.symbol}` : t("materials.notSet")}</p>
        </div>
        </div>
        <div className={styles.headerActions}>
          <Link href="/materials" className={styles.ghostLink}>{t("catalog.materials")}</Link>
        </div>
      </header>

      <section className={styles.section}>
        <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}><h2 className={styles.sectionTitle}>{t("materials.savePriceHist")}</h2></div>
        <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
          <form action={updateMaterial} className={catalogStyles.formGrid} data-tour="materials-form">
            <input type="hidden" name="id" value={material.id} />
            <FormField label={t("common.name")}><input name="name" defaultValue={material.name} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("common.category")}><input name="category" defaultValue={material.category} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("common.supplier")}><input name="supplierName" defaultValue={material.supplierName ?? ""} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("materials.minQty")}><input name="minStock" defaultValue={material.minStock.toString()} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("materials.storageUnit")}>
              <AppSelect
                name="storageUnitId"
                defaultValue={material.storageUnitId}
                disabled={!canManage}
                options={units.map((u) => ({ value: u.id, label: u.symbol }))}
              />
            </FormField>
            <FormField label={t("materials.purchaseUnit")}>
              <AppSelect
                name="purchaseUnitId"
                defaultValue={material.purchaseUnitId}
                disabled={!canManage}
                options={units.map((u) => ({ value: u.id, label: u.symbol }))}
              />
            </FormField>
            <FormField label={t("materials.packVolume")}><input name="packageWeight" defaultValue={material.packageWeight.toString()} disabled={!canManage} className="ui-input" /></FormField>
            <FormField label={t("materials.packPriceSom")}><input name="packagePrice" defaultValue={material.packagePrice.toString()} disabled={!canManage} className="ui-input" /></FormField>
            {canManage ? <PendingButton className={`${catalogStyles.formFull} ui-btn-primary min-h-[44px]`} pendingLabel={t("common.sending")}>{t("materials.savePriceHist")}</PendingButton> : null}
          </form>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}><h2 className={styles.sectionTitle}>{t("materials.priceHistory")}</h2></div>
        <div className={styles.sectionBody}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {material.prices.map((row) => (
              <li key={row.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "8px 0", borderBottom: "1px solid var(--line)", fontSize: 13 }}>
                <span style={{ color: "var(--ink-2)" }}>
                  {row.validFrom.toLocaleDateString(intlLocale(locale))}
                  {row.validTo ? ` — ${row.validTo.toLocaleDateString(intlLocale(locale))}` : ` — ${t("common.active")}`} · {t("materials.packShort")} {qtyDisplay(row.packageWeight)} / {moneyDisplay(row.packagePrice)} с
                </span>
                <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, fontWeight: 600 }}>{moneyDisplay(row.unitPrice)} {t("materials.perUnitShort")}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
