import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { SETTING_KEYS, DEFAULT_SETTINGS } from "@/lib/settings";
import { PrintFrame } from "@/components/print-frame";
import { getTranslator } from "@/lib/locale";
import { intlLocale } from "@/lib/i18n";

export default async function OrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ doc?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("orders.view");
  const { id } = await params;
  const { doc = "order" } = await searchParams;
  const titles: Record<string, string> = {
    order: t("print.orderClient"),
    invoice: t("orders.invoice"),
    receipt: t("orders.receipt"),
    waybill: t("orders.waybill"),
  };
  const title = titles[doc] ?? titles.order;
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
  const dl = intlLocale(locale);

  return (
    <PrintFrame title={`${title} №${order.number}`} subtitle={companyName}>
      <p>
        {order.customer.name}
        {order.customer.phone ? ` · ${order.customer.phone}` : ""}
        {order.customer.address ? ` · ${order.customer.address}` : ""}
      </p>
      <p>
        {t("print.seller")}: {order.seller.name}
      </p>
      {doc !== "receipt" ? (
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b">
              <th className="py-1">{t("common.product")}</th>
              <th className="py-1">{t("common.qty")}</th>
              <th className="py-1">{t("common.price")}</th>
              <th className="py-1">{t("common.amount")}</th>
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
              {p.createdAt.toLocaleString(dl)}: {moneyDisplay(p.amount)} с ·{" "}
              {p.method ? t(`pay.method.${p.method}`) : "—"}
            </li>
          ))}
        </ul>
      ) : null}
      {doc !== "waybill" ? (
        <>
          <p>
            {t("print.discount")}: {qtyDisplay(order.discountPercent)}% (−{moneyDisplay(order.discountAmount)} с)
          </p>
          <p className="text-base font-semibold">
            {t("common.total")}: {moneyDisplay(order.total)} с
          </p>
          <p>
            {t("print.paidDue", { paid: moneyDisplay(order.paidAmount), due: moneyDisplay(debt) })} ·{" "}
            {t(`pay.${order.paymentStatus}`)}
          </p>
        </>
      ) : (
        <p>
          {t("print.received")}: _________________ &nbsp;&nbsp; {t("print.issued")}: _________________
        </p>
      )}
    </PrintFrame>
  );
}
