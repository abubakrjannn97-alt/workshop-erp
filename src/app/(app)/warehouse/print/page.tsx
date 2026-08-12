import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { PrintFrame } from "@/components/print-frame";

export default async function WarehousePrintPage({
  searchParams,
}: {
  searchParams: Promise<{ warehouse?: string }>;
}) {
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
    <PrintFrame title="Складской документ" subtitle="Остатки на момент печати">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-1">Склад</th>
            <th className="py-1">Позиция</th>
            <th className="py-1">Остаток</th>
            <th className="py-1">Резерв</th>
            <th className="py-1">WAC</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1">{i.warehouse.name}</td>
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
