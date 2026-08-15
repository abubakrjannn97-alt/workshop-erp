import { getTranslator } from "@/lib/locale";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { confirmInventoryCount } from "@/app/actions/inventory";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";
import { PageHeader } from "@/components/page-header";

export default async function InventoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { t, locale, n } = await getTranslator();
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
      <div>
        <PageHeader
          title={`${t("wh.countTitle")} · ${n("wh", count.warehouse.code, count.warehouse.name)}`}
        />
        <p className="text-sm text-[var(--muted)]">{count.status === "DRAFT" ? t("wh.Draft") : t("wh.Posted")}</p>
      </div>
      <form action={confirmInventoryCount} className="space-y-4 ui-card">
        <input type="hidden" name="id" value={count.id} />
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-[var(--muted)]">
            <tr>
              <th className="py-2">{t("wh.position")}</th>
              <th className="py-2 text-right">{t("wh.byBooks")}</th>
              <th className="py-2 text-right">{t("wh.fact")}</th>
              <th className="py-2 text-right">{t("wh.diff")}</th>
            </tr>
          </thead>
          <tbody>
            {count.lines.map((line) => (
              <tr key={line.id} className="border-t border-[var(--line)]">
                <td className="py-2">
                  {line.stockItem.material?.name ?? line.stockItem.product?.name}
                  <input type="hidden" name="lineId" value={line.id} />
                </td>
                <td className="py-2 text-right font-mono text-xs">{qtyDisplay(line.systemQty)}</td>
                <td className="py-2 text-right">
                  <input
                    name="actualQty"
                    defaultValue={line.actualQty.toString()}
                    disabled={count.status !== "DRAFT"}
                    className="w-28 rounded border border-[var(--border)] px-2 py-1 text-right text-sm"
                  />
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  {qtyDisplay(line.difference)} / {moneyDisplay(line.amount)} с
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {count.status === "DRAFT" && canConfirm ? (
          <>
            <input name="reason" required placeholder={t("wh.diffReason")} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">
              {t("wh.confirmAdjust")}
            </button>
          </>
        ) : null}
      </form>
      <p className="text-xs text-[var(--muted)]">
        {t("wh.invExample")}
        {t("wh.invWac")}:{" "}
        {count.lines[0] ? moneyDisplay(D(String(count.lines[0].unitCost))) : "—"} {t("po.perUnit")}
      </p>
    </div>
  );
}
