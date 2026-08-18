import { getTranslator } from "@core/shared/i18n/locale";
import { notFound } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { confirmInventoryCount } from "@/app/actions/inventory";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { D } from "@core/shared/decimal";
import { PageHeader } from "@/components/page-header";
import { DashPanel } from "@/components/dash-panel";
import { FormField } from "@/components/form-field";
import { UiTable } from "@/components/data-table";
import { PendingButton } from "@/components/pending-button";
import { StatusBadge, type BadgeTone } from "@/components/status-badge";

function countTone(status: string): BadgeTone {
  if (status === "POSTED") return "good";
  return "warn";
}

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, n } = await getTranslator();
  const { id } = await params;
  await requirePermission("inventory.count");
  const session = await requirePermission("inventory.view");
  const canConfirm =
    session.user.roleCode === "owner" || session.user.permissions.includes("inventory.adjust");
  const count = await prisma.inventoryCount.findUnique({
    where: { id },
    include: {
      warehouse: true,
      lines: { include: { stockItem: { include: { material: true, product: true } } } },
    },
  });
  if (!count) notFound();

  return (
    <div className="page-stack">
      <PageHeader
        title={`${t("wh.countTitle")} · ${n("wh", count.warehouse.code, count.warehouse.name)}`}
        meta={
          <StatusBadge
            label={count.status === "DRAFT" ? t("wh.Draft") : t("wh.Posted")}
            tone={countTone(count.status)}
          />
        }
      />

      <DashPanel title={t("wh.invTitle")}>
        <form action={confirmInventoryCount} className="space-y-4">
          <input type="hidden" name="id" value={count.id} />
          <UiTable>
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3">{t("wh.position")}</th>
                  <th className="px-4 py-3 text-right">{t("wh.byBooks")}</th>
                  <th className="px-4 py-3 text-right">{t("wh.fact")}</th>
                  <th className="px-4 py-3 text-right">{t("wh.diff")}</th>
                </tr>
              </thead>
              <tbody>
                {count.lines.map((line) => (
                  <tr key={line.id} className="border-t border-[var(--line)]">
                    <td className="px-4 py-3" data-label={t("wh.position")}>
                      {line.stockItem.material?.name ?? line.stockItem.product?.name}
                      <input type="hidden" name="lineId" value={line.id} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("wh.byBooks")}>
                      {qtyDisplay(line.systemQty)}
                    </td>
                    <td className="px-4 py-3 text-right" data-label={t("wh.fact")}>
                      <input
                        name="actualQty"
                        defaultValue={line.actualQty.toString()}
                        disabled={count.status !== "DRAFT"}
                        className="ui-input w-28 text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs" data-label={t("wh.diff")}>
                      {qtyDisplay(line.difference)} / {moneyDisplay(line.amount)} с
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </UiTable>
          {count.status === "DRAFT" && canConfirm ? (
            <>
              <FormField label={t("wh.diffReason")} required>
                <input name="reason" required className="ui-input" />
              </FormField>
              <PendingButton className="ui-btn-primary min-h-[44px]" pendingLabel={t("common.sending")}>
                {t("wh.confirmAdjust")}
              </PendingButton>
            </>
          ) : null}
        </form>
      </DashPanel>

      <p className="text-xs text-[var(--muted)]">
        {t("wh.invExample")}
        {t("wh.invWac")}:{" "}
        {count.lines[0] ? moneyDisplay(D(String(count.lines[0].unitCost))) : "—"} {t("po.perUnit")}
      </p>
    </div>
  );
}
