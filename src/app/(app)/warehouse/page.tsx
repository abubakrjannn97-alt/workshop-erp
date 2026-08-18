import { PageHeader } from "@/components/page-header";
import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { UiTable } from "@/components/ui-table";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { receiveOpening, writeOffStock } from "@/app/actions/inventory";
import { createPurchaseFromShortage } from "@/app/actions/purchasing";
import { RevealList } from "@/components/reveal-list";
import { IdempotencyField } from "@/components/idempotency-field";
import { PendingButton } from "@/components/pending-button";
import { getRawWarehouse } from "@/core/config/resolve-warehouse";
import { resolveRawWarehouseCode } from "@/core/config/resolve-warehouse";

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

  const [items, materials, suppliers] = await Promise.all([
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
  ]);

  return (
    <div className="page-stack">
      <div>
        <PageHeader title={t("wh.rawTitle")} />
        <p className="mt-1 text-sm text-[var(--text-muted)]">{t("wh.rawHint")}</p>
        <a href={`/warehouse/print?warehouse=${rawCode}`} className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          {t("wh.printStock")}
        </a>
      </div>
      <WarehouseNav current="raw" locale={locale} />

      <div className="overflow-hidden ui-card" data-tour="warehouse-stock">
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
                    <td className="px-4 py-3">
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
      </div>

      {canReceive ? (
        <form action={receiveOpening} className="grid gap-2 ui-card sm:grid-cols-5" data-tour="warehouse-in">
          <input type="hidden" name="warehouseId" value={raw.id} />
          <IdempotencyField prefix="wh-in" />
          <select name="materialId" className="ui-input">
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder={t("common.quantity")} className="ui-input" />
          <input name="unitCost" required placeholder={t("common.unitPrice")} className="ui-input" />
          <input name="comment" placeholder={t("common.comment")} className="ui-input" />
          <PendingButton className="ui-btn-primary" pendingLabel={t("common.sending")}>
            {t("common.receipt")}
          </PendingButton>
        </form>
      ) : null}

      {canAdjust ? (
        <form action={writeOffStock} className="grid gap-2 ui-card sm:grid-cols-5" data-tour="warehouse-out">
          <input type="hidden" name="warehouseId" value={raw.id} />
          <IdempotencyField prefix="wh-out" />
          <select name="materialId" className="ui-input">
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input name="quantity" required placeholder={t("wh.writeQty")} className="ui-input" />
          <input name="reason" required placeholder={t("common.reason")} className="ui-input" />
          <input name="comment" placeholder={t("common.comment")} className="ui-input" />
          <PendingButton className="ui-btn-danger" pendingLabel={t("common.sending")}>
            {t("common.writeOff")}
          </PendingButton>
        </form>
      ) : null}

      <p className="text-xs text-[var(--muted)]">{t("wh.stockCount")}: {items.length}</p>
    </div>
  );
}
