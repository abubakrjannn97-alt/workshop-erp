import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { PrintFrame } from "@/components/print-frame";

export default async function PurchasePrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("purchasing.view");
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { material: { include: { storageUnit: true } } } } },
  });
  if (!order) notFound();

  return (
    <PrintFrame title={`Закупочная накладная ${order.number}`} subtitle={order.supplier.name}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-1">Материал</th>
            <th className="py-1">Кол-во</th>
            <th className="py-1">Цена</th>
            <th className="py-1">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b">
              <td className="py-1">{i.material.name}</td>
              <td className="py-1">
                {qtyDisplay(i.quantity)} {i.material.storageUnit.symbol}
              </td>
              <td className="py-1">{moneyDisplay(i.unitPrice)} с</td>
              <td className="py-1">{moneyDisplay(i.amount)} с</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-base font-semibold">Итого: {moneyDisplay(order.total)} с</p>
      <p>Получил: _________________</p>
    </PrintFrame>
  );
}
