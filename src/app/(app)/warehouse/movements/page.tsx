import { getTranslator, intlLocale } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { WarehouseNav } from "@/components/warehouse-nav";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { reverseStockMovement } from "@/app/actions/inventory";
import { IdempotencyField } from "@/components/idempotency-field";
import { PageHeader } from "@/components/page-header";
import { DataTableSection, UiTable } from "@/components/data-table";

function moveType(t: (k: string) => string, code: string) {
  const map: Record<string, string> = {
    RECEIPT: t("wh.move.RECEIPT"),
    RESERVE: t("wh.move.RESERVE"),
    RELEASE: t("wh.move.UNRESERVE"),
    ISSUE: t("wh.move.ISSUE"),
    RETURN: t("wh.move.RETURN"),
    WRITE_OFF: t("wh.move.WRITE_OFF"),
    INVENTORY: t("wh.move.INVENTORY"),
    ADJUST: t("wh.move.ADJUST"),
    TRANSFER_OUT: t("wh.move.TRANSFER_OUT"),
    TRANSFER_IN: t("wh.move.TRANSFER_IN"),
    REVERSAL: t("wh.move.REVERSAL"),
  };
  return map[code] ?? code;
}

export default async function MovementsPage() {
  const { t, locale, n } = await getTranslator();
  const session = await requirePermission("inventory.view");
  const canAdjust =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const movements = await prisma.stockMovement.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
    include: {
      warehouse: true,
      stockItem: { include: { material: true, product: true } },
      reversedBy: true,
    },
  });

  return (
    <div className="page-stack">
      <PageHeader title={t("wh.movesTitle")} description={t("wh.movesHint")} />
      <WarehouseNav current="moves" locale={locale} />
      <DataTableSection>
        <UiTable>
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">{t("wh.time")}</th>
                <th className="px-4 py-3">{t("wh.type")}</th>
                <th className="px-4 py-3">{t("wh.position")}</th>
                <th className="px-4 py-3 text-right">{t("common.qty")}</th>
                <th className="px-4 py-3 text-right">{t("common.amount")}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 text-xs text-[var(--muted)]" data-label={t("wh.time")}>
                    {m.createdAt.toLocaleString(intlLocale(locale))}
                  </td>
                  <td className="px-4 py-3" data-label={t("wh.type")}>
                    {moveType(t, m.type) ?? m.type}
                  </td>
                  <td className="px-4 py-3" data-label={t("wh.position")}>
                    {m.stockItem.material?.name ?? m.stockItem.product?.name}
                    <p className="text-xs text-[var(--muted)]">{n("wh", m.warehouse.code, m.warehouse.name)}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.qty")}>
                    {qtyDisplay(m.qty)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("common.amount")}>
                    {moneyDisplay(m.amount)} с
                  </td>
                  <td className="px-4 py-3">
                    {canAdjust && !m.reversedBy && m.type !== "REVERSAL" ? (
                      <form action={reverseStockMovement}>
                        <input type="hidden" name="id" value={m.id} />
                        <IdempotencyField prefix={`rev-${m.id}`} />
                        <button className="text-xs text-[var(--danger)]">{t("wh.revBtn")}</button>
                      </form>
                    ) : m.reversedBy ? (
                      <span className="text-xs text-[var(--muted)]">{t("wh.reversed")}</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </UiTable>
      </DataTableSection>
    </div>
  );
}
