import { getTranslator } from "@core/shared/i18n/locale";
import Link from "next/link";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { receiveOpening } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { getFgWarehouse } from "@/core/config/resolve-warehouse";
import styles from "../../warehouse.module.css";

export default async function FgReceivePage() {
  const { t } = await getTranslator();
  await requirePermission("inventory.receive");
  const fg = await getFgWarehouse();
  const products = await prisma.product.findMany({
    where: { archivedAt: null, isActive: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.title}>{t("common.receipt")}</h1>
          <p className={styles.subtitle}>{t("wh.fgReceiveHint")}</p>
        </div>
        <Link href="/warehouse/finished" className={styles.ghostLink}>
          {t("common.back")}
        </Link>
      </header>

      <section className={styles.section}>
        <div className={styles.sectionBody}>
          <form action={receiveOpening} className="grid gap-3 sm:grid-cols-2">
            <input type="hidden" name="warehouseId" value={fg.id} />
            <IdempotencyField prefix="fg-receive" />
            <FormField label={t("common.product")}>
              <AppSelect
                name="productId"
                defaultValue={products[0]?.id ?? ""}
                options={products.map((p) => ({ value: p.id, label: p.name }))}
              />
            </FormField>
            <FormField label={t("common.quantity")} required>
              <input name="quantity" required className="ui-input" />
            </FormField>
            <FormField label={t("common.unitPrice")} required>
              <input name="unitCost" required className="ui-input" />
            </FormField>
            <FormField label={t("common.comment")}>
              <input name="comment" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-soft min-h-[40px] sm:col-span-2" pendingLabel={t("common.sending")}>
              {t("common.receipt")}
            </PendingButton>
          </form>
        </div>
      </section>
    </div>
  );
}
