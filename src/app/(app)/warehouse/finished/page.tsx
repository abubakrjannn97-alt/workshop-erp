import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { DataTableSection, UiTable } from "@/components/data-table";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { receiveOpening } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { getFgWarehouse } from "@/core/config/resolve-warehouse";

export default async function FinishedWarehousePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const fg = await getFgWarehouse();
  const [items, products] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: fg.id, productId: { not: null } },
      include: { product: { include: { saleUnit: true, outputUnit: true } } },
      orderBy: { product: { name: "asc" } },
    }),
    prisma.product.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("whNav.fg")} description={t("wh.fgHint")} />
      <WarehouseNav current="fg" locale={locale} />
      <DataTableSection>
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("common.product")}</th>
                <th className="px-4 py-3 text-right">{t("common.stock")}</th>
                <th className="px-4 py-3 text-right">{t("common.reserve")}</th>
                <th className="px-4 py-3 text-right">{t("common.available")}</th>
                <th className="px-4 py-3 text-right">{t("common.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-[var(--muted)]" colSpan={5}>
                    {t("wh.fgEmpty")}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const onHand = D(String(item.qtyOnHand));
                  const reserved = D(String(item.qtyReserved));
                  return (
                    <tr key={item.id} className="border-t border-[var(--line)]">
                      <td className="px-4 py-3 font-medium" data-label={t("common.product")}>
                        {item.product?.name}
                      <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.stock")}>
                        {qtyDisplay(onHand)} {item.product?.saleUnit.symbol}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.reserve")}>
                        {qtyDisplay(reserved)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.available")}>
                        {qtyDisplay(onHand.sub(reserved))}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.cost")}>
                        {moneyDisplay(onHand.mul(item.wacUnitCost))} с
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </UiTable>
      </DataTableSection>
      {canReceive ? (
        <DashPanel title={t("common.receipt")}>
          <form action={receiveOpening} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="warehouseId" value={fg.id} />
            <IdempotencyField prefix="fg-receive" />
            <FormField label={t("common.product")}>
              <select name="productId" className="ui-input">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
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
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>
              {t("common.receipt")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}
    </div>
  );
}
