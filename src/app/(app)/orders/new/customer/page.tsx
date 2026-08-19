import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { requirePermission } from "@core/auth/authz";
import { createCustomer } from "@/app/actions/customers";
import { FormField } from "@/components/form-field";
import { PendingButton } from "@/components/pending-button";
import { PageHeader } from "@/components/page-header";
import formStyles from "../../order-form.module.css";

export default async function QuickCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; error?: string }>;
}) {
  const { t } = await getTranslator();
  await requirePermission("crm.manage");
  const { leadId, error } = await searchParams;
  const backHref = leadId ? `/orders/new?leadId=${leadId}` : "/orders/new";

  async function action(formData: FormData) {
    "use server";
    const result = await createCustomer(formData);
    if (result?.error) {
      const params = new URLSearchParams({ error: result.error });
      if (leadId) params.set("leadId", leadId);
      redirect(`/orders/new/customer?${params}`);
    }
    if (result.ok && result.id) {
      const params = new URLSearchParams({ customerId: result.id });
      if (leadId) params.set("leadId", leadId);
      redirect(`/orders/new?${params}`);
    }
  }

  return (
    <div className="page-stack" style={{ gap: "12px" }}>
      <PageHeader title={t("orders.addCustomer")} backHref={backHref} backLabel={t("common.back")} />
      <p className="m-0 text-sm text-[var(--ink-2)]">{t("orders.addCustomerHint")}</p>
      {error ? (
        <p className="m-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</p>
      ) : null}
      <form action={action} className={`ui-card ${formStyles.form}`}>
        <FormField label={t("crm.fioCompany")} required className={formStyles.compactField}>
          <input name="name" className="ui-input" required autoFocus />
        </FormField>
        <div className={formStyles.qtyPriceRow}>
          <FormField label={t("common.phone")} className={formStyles.compactField}>
            <input name="phone" className="ui-input" inputMode="tel" />
          </FormField>
          <FormField label={t("common.whatsapp")} className={formStyles.compactField}>
            <input name="whatsapp" className="ui-input" inputMode="tel" />
          </FormField>
        </div>
        <FormField label={t("common.source")} className={formStyles.compactField}>
          <input name="source" className="ui-input" />
        </FormField>
        <PendingButton className="ui-btn-primary min-h-[44px] w-full" pendingLabel={t("common.saving")}>
          {t("common.save")}
        </PendingButton>
      </form>
    </div>
  );
}
