import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { createMaterial } from "@/app/actions/materials";
import { AppSelect } from "@/components/app-select";
import styles from "@/styles/premium.module.css";
import catalogStyles from "@/components/catalog-form.module.css";

export default async function NewMaterialPage() {
  const { t } = await getTranslator();
  await requirePermission("materials.manage");
  const units = await prisma.unit.findMany({
    where: { archivedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  async function action(formData: FormData) {
    "use server";
    const result = await createMaterial(formData);
    if (result.ok && result.id) redirect(`/materials/${result.id}`);
  }

  return (
    <div className={`${styles.page} ${catalogStyles.pageTight}`}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("materials.newTitle")}</h1>
        </div>
      </header>
      <section className={styles.section} data-tour="materials-form">
        <div className={`${styles.sectionHead} ${catalogStyles.sectionTightHead}`}>
          <h2 className={styles.sectionTitle}>{t("materials.newTitle")}</h2>
        </div>
        <div className={`${styles.sectionBody} ${catalogStyles.sectionTightBody}`}>
          <form action={action} className={catalogStyles.formGrid}>
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
            <button type="submit" className={`${catalogStyles.formFull} ui-btn-primary min-h-[44px]`}>
              {t("common.create")}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
