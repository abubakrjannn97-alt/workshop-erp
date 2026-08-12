import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import {
  cancelPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  registerPurchasePayment,
} from "@/app/actions/purchasing";
import { moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";

const STATUS: Record<string, string> = {
  REQUEST: "Заявка",
  ORDERED: "Заказано поставщику",
  POSTED: "Оприходовано",
  CANCELLED: "Отменено",
};

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requirePermission("purchasing.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canReceive =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.receive");
  const order = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { supplier: true, items: { include: { material: { include: { storageUnit: true } } } }, payments: true },
  });
  if (!order) notFound();
  const debt = D(String(order.total)).sub(order.paidAmount);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-slate-500">{STATUS[order.status]}</p>
        <h1 className="text-2xl font-semibold">{order.number}</h1>
        <p className="text-sm text-slate-600">{order.supplier.name}</p>
        <Link href={`/purchasing/${order.id}/print`} className="mt-2 inline-block text-sm text-[var(--titan-dark)] hover:underline">
          Печать накладной / PDF
        </Link>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Материал</th>
              <th className="px-4 py-3 text-right">Кол-во</th>
              <th className="px-4 py-3 text-right">Цена</th>
              <th className="px-4 py-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{item.material.name}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {qtyDisplay(item.quantity)} {item.material.storageUnit.symbol}
                </td>
                <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(item.amount)} с</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">
        Итого {moneyDisplay(order.total)} с · оплачено {moneyDisplay(order.paidAmount)} с · долг{" "}
        {moneyDisplay(debt)} с
      </p>
      <div className="flex flex-wrap gap-2">
        {canManage && order.status === "REQUEST" ? (
          <form action={confirmPurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="rounded-lg bg-[var(--titan-dark)] px-4 py-2 text-sm text-white">Подтвердить заказ поставщику</button>
          </form>
        ) : null}
        {canReceive && (order.status === "ORDERED" || order.status === "REQUEST") ? (
          <form action={receivePurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="rounded-lg bg-[var(--titan-dark)] px-4 py-2 text-sm text-white">Принять и оприходовать</button>
          </form>
        ) : null}
        {canManage && order.status !== "POSTED" && order.status !== "CANCELLED" ? (
          <form action={cancelPurchaseOrder}>
            <input type="hidden" name="id" value={order.id} />
            <button className="rounded-lg px-4 py-2 text-sm text-red-700">Отменить</button>
          </form>
        ) : null}
      </div>
      {canManage && order.status !== "CANCELLED" ? (
        <form action={registerPurchasePayment} className="flex max-w-md gap-2">
          <input type="hidden" name="id" value={order.id} />
          <input name="amount" placeholder="Оплата, с" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Оплата</button>
        </form>
      ) : null}
    </div>
  );
}
