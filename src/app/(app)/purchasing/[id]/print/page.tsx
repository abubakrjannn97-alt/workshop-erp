import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { PrintFrame } from "@/components/print-frame";
import { getTranslator } from "@/lib/locale";

export default async function PurchasePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { t } = await getTranslator();
  await requirePermission("purchasing.view");
  const { id } = await params;
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { material: { include: { storageUnit: true } } } } },
  });
  if (!order) notFound();

  return (
    <PrintFrame title={t("print.poWaybill", { n: order.number })} subtitle={order.supplier.name}>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b">
            <th className="py-1">{t("common.material")}</th>
            <th className="py-1">{t("common.qty")}</th>
            <th className="py-1">{t("common.price")}</th>
            <th className="py-1">{t("common.amount")}</th>
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
      <p className="mt-3 text-base font-semibold">
        {t("common.total")}: {moneyDisplay(order.total)} с
      </p>
      <p>
        {t("print.received")}: _________________
      </p>
    </PrintFrame>
  );
}
