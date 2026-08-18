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
import { receiveOpening, transferWarehouse, writeOffStock } from "@/app/actions/inventory";
import { createPurchaseFromShortage } from "@/app/actions/purchasing";
import { RevealList } from "@/components/reveal-list";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { resolveRawWarehouseCode } from "@/core/config/resolve-warehouse";
import Link from "next/link";

export default async function WarehousePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.receive");
  const canAdjust =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const canBuy =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");

  const raw = await getRawWarehouse();
  const rawCode = await resolveRawWarehouseCode();

  const [items, materials, suppliers, warehouses] = await Promise.all([
    prisma.stockItem.findMany({
      where: { warehouseId: raw.id, materialId: { not: null } },
      include: { material: { include: { storageUnit: true } } },
      orderBy: { material: { name: "asc" } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: { where: { warehouseId: raw.id } } },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({ where: { archivedAt: null }, orderBy: { name: "asc" } }),
    prisma.warehouse.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader
        title={t("wh.rawTitle")}
        description={t("wh.rawHint")}
        actions={
          <Link href={`/warehouse/print?warehouse=${rawCode}`} className="ui-btn-secondary">
            {t("wh.printStock")}
          </Link>
        }
      />
      <WarehouseNav current="raw" locale={locale} />

      <DataTableSection tour="warehouse-stock">
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("common.material")}</th>
                <th className="px-4 py-3 text-right">{t("common.stock")}</th>
                <th className="px-4 py-3 text-right">{t("common.reserve")}</th>
                <th className="px-4 py-3 text-right">{t("common.available")}</th>
                <th className="px-4 py-3 text-right">{t("common.cost")}</th>
                <th className="px-4 py-3 text-right">{t("common.min")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <RevealList as="tbody" moreLabel={t("home.seeAll")} lessLabel={t("home.hide")} limit={5}>
              {materials.map((material) => {
                const stock = material.stockItems[0];
                const onHand = D(String(stock?.qtyOnHand ?? 0));
                const reserved = D(String(stock?.qtyReserved ?? 0));
                const avail = onHand.sub(reserved);
                const value = onHand.mul(stock?.wacUnitCost ?? 0);
                const low = onHand.lte(material.minStock);
                return (
                  <tr key={material.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3" data-label={t("common.material")}>
                      <p className="font-medium">{material.name}</p>
                      {low ? <p className="text-xs text-amber-700">{t("wh.belowMin")}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.stock")}>
                      {qtyDisplay(onHand)} {material.storageUnit.symbol}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.reserve")}>
                      {qtyDisplay(reserved)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.available")}>
                      {qtyDisplay(avail)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.cost")}>
                      {moneyDisplay(value)} с
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.min")}>
                      {qtyDisplay(material.minStock)} {material.storageUnit.symbol}
                    </td>
                    <td className="px-4 py-3">
                      {canBuy && low && suppliers[0] ? (
                        <form action={createPurchaseFromShortage}>
                          <input type="hidden" name="supplierId" value={suppliers[0].id} />
                          <input type="hidden" name="materialId" value={material.id} />
                          <input
                            type="hidden"
                            name="quantity"
                            value={D(String(material.minStock)).sub(onHand).abs().toFixed(6)}
                          />
                          <button className="text-xs font-semibold text-accent-500">{t("wh.poRequest")}</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </RevealList>
          </table>
        </UiTable>
      </DataTableSection>

      {canReceive ? (
        <DashPanel title={t("common.receipt")} tour="warehouse-in">
          <form action={receiveOpening} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="warehouseId" value={raw.id} />
            <IdempotencyField prefix="wh-in" />
            <FormField label={t("common.material")}>
              <select name="materialId" className="ui-input">
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
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

      {canAdjust ? (
        <DashPanel title={t("common.writeOff")} tour="warehouse-out">
          <form action={writeOffStock} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="warehouseId" value={raw.id} />
            <IdempotencyField prefix="wh-out" />
            <FormField label={t("common.material")}>
              <select name="materialId" className="ui-input">
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("wh.writeQty")} required>
              <input name="quantity" required className="ui-input" />
            </FormField>
            <FormField label={t("common.reason")} required>
              <input name="reason" required className="ui-input" />
            </FormField>
            <FormField label={t("common.comment")}>
              <input name="comment" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-danger min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>
              {t("common.writeOff")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}

      {canAdjust ? (
        <DashPanel title={t("wh.transfer")}>
          <form action={transferWarehouse} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="fromWarehouseId" value={raw.id} />
            <IdempotencyField prefix="wh-tr" />
            <FormField label={t("wh.toWarehouse")}>
              <select name="toWarehouseId" className="ui-input">
                {warehouses
                  .filter((w) => w.id !== raw.id)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField label={t("common.material")}>
              <select name="materialId" className="ui-input">
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label={t("common.quantity")} required>
              <input name="quantity" required className="ui-input" />
            </FormField>
            <FormField label={t("common.comment")}>
              <input name="comment" className="ui-input" />
            </FormField>
            <PendingButton className="ui-btn-primary min-h-[44px] sm:col-span-2 lg:col-span-5" pendingLabel={t("common.sending")}>
              {t("wh.transfer")}
            </PendingButton>
          </form>
        </DashPanel>
      ) : null}

      <p className="text-xs text-[var(--muted)]">{t("wh.stockCount")}: {items.length}</p>
    </div>
  );
}
