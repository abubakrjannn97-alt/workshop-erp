import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { UiTable } from "@/components/ui-table";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { receiveOpening } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
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
      <div>
        <PageHeader title={t("whNav.fg")} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("wh.fgHint")}</p>
      </div>
      <WarehouseNav current="fg" locale={locale} />
      <div className="overflow-hidden ui-card">
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
                      <td className="px-4 py-3 font-medium">{item.product?.name}</td>
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
      </div>
      {canReceive ? (
        <form action={receiveOpening} className="grid gap-2 ui-card sm:grid-cols-5">
          <input type="hidden" name="warehouseId" value={fg.id} />
          <IdempotencyField prefix="fg-receive" />
          <select name="productId" className="ui-input">
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder={t("common.quantity")} className="ui-input" />
          <input name="unitCost" required placeholder={t("common.unitPrice")} className="ui-input" />
          <input name="comment" placeholder={t("common.comment")} className="ui-input" />
          <button type="submit" className="ui-btn-primary">
            {t("common.receipt")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
