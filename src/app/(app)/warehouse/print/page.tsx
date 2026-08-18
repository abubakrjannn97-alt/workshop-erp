import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { PrintFrame } from "@/components/print-frame";
import { getTranslator } from "@core/shared/i18n/locale";

export default async function WarehousePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string }>;
}) {
  const { t, n } = await getTranslator();
  await requirePermission("inventory.view");
  const { warehouse } = await searchParams;
  const items = await prisma.stockItem.findMany({
    where: warehouse ? { warehouse: { code: warehouse } } : undefined,
    include: {
      warehouse: true,
      material: { include: { storageUnit: true } },
      product: { include: { saleUnit: true } },
    },
    orderBy: { warehouseId: "asc" },
  });

  return (
    <PrintFrame title={t("print.whDoc")} subtitle={t("print.whAsOf")}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-1">{t("page.warehouse")}</th>
            <th className="py-1">{t("wh.position")}</th>
            <th className="py-1">{t("common.stock")}</th>
            <th className="py-1">{t("common.reserve")}</th>
            <th className="py-1">WAC</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1">{n("wh", i.warehouse.code, i.warehouse.name)}</td>
              <td className="py-1">{i.material?.name ?? i.product?.name ?? "—"}</td>
              <td className="py-1">{qtyDisplay(i.qtyOnHand)}</td>
              <td className="py-1">{qtyDisplay(i.qtyReserved)}</td>
              <td className="py-1">{moneyDisplay(i.wacUnitCost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PrintFrame>
  );
}
