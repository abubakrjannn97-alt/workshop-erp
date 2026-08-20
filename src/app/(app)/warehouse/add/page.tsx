import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { addRawMaterialToWarehouse } from "@/app/actions/inventory";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { PageHeader } from "@/components/page-header";
import { IdempotencyField } from "@/components/idempotency-field";

export default async function AddWarehouseMaterialPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { t } = await getTranslator();
  const session = await requirePermission("inventory.view");
  if (!hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive")) {
    redirect("/warehouse");
  }
  const { error } = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const result = await addRawMaterialToWarehouse(formData);
    if (result?.error) {
      redirect(`/warehouse/add?error=${encodeURIComponent(result.error)}`);
    }
  }

  return (
    <div className="page-stack" style={{ gap: "12px" }}>
      <PageHeader title={t("wh.addMaterial")} backHref="/warehouse" backLabel={t("common.back")} />
      <p className="m-0 text-sm text-[var(--ink-2)]">{t("wh.addMaterialHint")}</p>
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
      <form action={action} className="ui-card grid gap-3 p-4">
        <IdempotencyField prefix="wh-add" />
        <FormField label={t("common.name")} required>
          <input name="name" required autoFocus placeholder={t("wh.addMaterialNamePh")} className="ui-input" />
        </FormField>
        <FormField label={t("common.category")}>
          <input name="category" placeholder={t("wh.addMaterialCategoryPh")} className="ui-input" />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("common.quantity")} required>
            <input name="quantity" required inputMode="decimal" placeholder="100" className="ui-input" />
          </FormField>
          <FormField label={t("common.unitPrice")} required>
            <input name="unitCost" required inputMode="decimal" placeholder="4.50" className="ui-input" />
          </FormField>
        </div>
        <FormField label={t("common.comment")}>
          <input name="comment" className="ui-input" />
        </FormField>
        <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.sending")}>
          {t("wh.addMaterial")}
        </PendingButton>
      </form>
    </div>
  );
}
