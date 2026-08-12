import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { PAYMENT_STATUS } from "@/lib/orders";
import { SETTING_KEYS, DEFAULT_SETTINGS } from "@/lib/settings";
import { PrintFrame } from "@/components/print-frame";

const DOCS: Record<string, string> = {
  order: "Заказ клиента",
  invoice: "Счёт",
  receipt: "Квитанция",
  waybill: "Накладная",
};

export default async function OrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const session = await requirePermission("orders.view");
  const { id } = await params;
  const { doc = "order" } = await searchParams;
  const title = DOCS[doc] ?? DOCS.order;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: true,
      status: true,
      items: { include: { product: { include: { saleUnit: true } } } },
      payments: true,
    },
  });
  if (!order) notFound();
  if (session.user.roleCode === "sales_manager" && order.sellerId !== session.user.id) {
    redirect("/orders");
  }
  const company = await prisma.setting.findUnique({ where: { key: SETTING_KEYS.companyName } });
  const companyName = typeof company?.value === "string" ? company.value : DEFAULT_SETTINGS.companyName;
  const debt = D(String(order.total)).sub(order.paidAmount);

  return (
    <PrintFrame title={`${title} №${order.number}`} subtitle={companyName}>
      <p>
        {order.customer.name}
        {order.customer.phone ? ` · ${order.customer.phone}` : ""}
        {order.customer.address ? ` · ${order.customer.address}` : ""}
      </p>
      <p>Продавец: {order.seller.name}</p>
      {doc !== "receipt" ? (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1">Изделие</th>
              <th className="py-1">Кол-во</th>
              <th className="py-1">Цена</th>
              <th className="py-1">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-1">{item.product.name}</td>
                <td className="py-1">
                  {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol}
                </td>
                <td className="py-1">{doc === "waybill" ? "—" : `${moneyDisplay(item.unitPrice)} с`}</td>
                <td className="py-1">{doc === "waybill" ? "—" : `${moneyDisplay(item.amount)} с`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {doc === "receipt" ? (
        <ul className="space-y-1">
          {order.payments.map((p) => (
            <li key={p.id}>
              {p.createdAt.toLocaleString("ru-RU")}: {moneyDisplay(p.amount)} с · {p.method ?? "—"}
            </li>
          ))}
        </ul>
      ) : null}
      {doc !== "waybill" ? (
        <>
          <p>Скидка: {qtyDisplay(order.discountPercent)}% (−{moneyDisplay(order.discountAmount)} с)</p>
          <p className="text-base font-semibold">Итого: {moneyDisplay(order.total)} с</p>
          <p>
            Оплачено: {moneyDisplay(order.paidAmount)} с · к оплате: {moneyDisplay(debt)} с ·{" "}
            {PAYMENT_STATUS[order.paymentStatus as keyof typeof PAYMENT_STATUS] ?? order.paymentStatus}
          </p>
        </>
      ) : (
        <p>Получил: _________________ &nbsp;&nbsp; Выдал: _________________</p>
      )}
    </PrintFrame>
  );
}
