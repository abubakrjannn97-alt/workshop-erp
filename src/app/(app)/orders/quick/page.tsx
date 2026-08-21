import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { getFgWarehouse } from "@core/config/resolve-warehouse";
import { available } from "@core/inventory/stock";
import { D, qtyDisplay } from "@core/shared/decimal";
import { PageHeader } from "@/components/page-header";
import { FormField } from "@/components/form-field";
import { AppSelect } from "@/components/app-select";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { quickSaleFromFg } from "@/app/actions/quick-sale";

export default async function QuickSalePage() {
  const { t } = await getTranslator();
  const session = await requirePermission("orders.create");
  const canIssue = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  if (!canIssue) {
    return (
      <div className="page-stack">
        <PageHeader title={t("sales.quickTitle")} backHref="/orders" backLabel={t("common.back")} />
        <p className="text-sm text-[var(--ink-2)]">{t("sales.quickNoIssue")}</p>
      </div>
    );
  }

  const fg = await getFgWarehouse();
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: {
        archivedAt: null,
        ...(session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {}),
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      include: {
        saleUnit: true,
        prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 },
        stockItems: { where: { warehouseId: fg.id } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const sellable = products
    .map((p) => {
      const onHand = available(
        p.stockItems[0]?.qtyOnHand ?? 0,
        p.stockItems[0]?.qtyReserved ?? 0,
      );
      return {
        id: p.id,
        name: p.name,
        symbol: p.saleUnit.symbol,
        price: String(p.prices[0]?.price ?? p.minPrice ?? "0"),
        onHand: qtyDisplay(onHand),
        hasStock: D(String(onHand)).gt(0),
      };
    })
    .filter((p) => p.hasStock);

  async function action(formData: FormData) {
    "use server";
    const result = await quickSaleFromFg(formData);
    if (result.error) return;
    if (result.ok && result.id) redirect(`/orders/${result.id}`);
  }

  return (
    <div className="page-stack" style={{ gap: 12 }}>
      <PageHeader title={t("sales.quickTitle")} backHref="/orders" backLabel={t("common.back")} />
      <p className="m-0 text-[13px] text-[var(--ink-2)]">{t("sales.quickHint")}</p>

          {customers.length === 0 ? (
        <p className="text-sm text-[var(--ink-2)]">{t("crm.emptyDesc")}</p>
      ) : sellable.length === 0 ? (
        <p className="text-sm text-[var(--ink-2)]">{t("sales.quickNoStock")}</p>
      ) : (
        <form action={action} className="grid gap-3 max-w-xl">
          <IdempotencyField prefix="quick-sale" />
          <FormField label={t("common.customer")} required>
            <AppSelect
              name="customerId"
              defaultValue={customers[0]?.id ?? ""}
              options={customers.map((c) => ({ value: c.id, label: c.name }))}
            />
          </FormField>
          <FormField label={t("common.product")} required>
            <AppSelect
              name="productId"
              defaultValue={sellable[0]?.id ?? ""}
              options={sellable.map((p) => ({
                value: p.id,
                label: `${p.name} · ${p.onHand} ${p.symbol}`,
              }))}
            />
          </FormField>
          <FormField label={t("common.quantity")} required>
            <input name="quantity" required className="ui-input" inputMode="decimal" defaultValue="1" />
          </FormField>
          <FormField label={t("common.unitPrice")} required>
            <input
              name="unitPrice"
              required
              className="ui-input"
              inputMode="decimal"
              defaultValue={sellable[0]?.price ?? "0"}
            />
          </FormField>
          <FormField label={t("sales.quickPay")}>
            <select name="paidNow" className="ui-input" defaultValue="1">
              <option value="1">{t("sales.quickPaidNow")}</option>
              <option value="0">{t("sales.quickUnpaid")}</option>
            </select>
          </FormField>
          <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
            {t("sales.quickSubmit")}
          </PendingButton>
        </form>
      )}
    </div>
  );
}
