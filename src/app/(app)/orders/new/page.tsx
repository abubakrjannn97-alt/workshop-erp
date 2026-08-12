import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { createOrder } from "@/app/actions/orders";
import { SalesNav } from "@/components/sales-nav";
import { OrderForm } from "../order-form";
import { discountLimitPercent } from "@/lib/orders";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const session = await requirePermission("orders.create");
  const { leadId } = await searchParams;
  const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;
  const canDiscount = hasPermission(session.user.permissions, session.user.roleCode, "orders.discount");
  const canChooseSeller = session.user.roleCode !== "sales_manager";

  const [customers, products, sellers, limit] = await Promise.all([
    prisma.customer.findMany({
      where: {
        archivedAt: null,
        ...(session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {}),
      },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      include: {
        saleUnit: true,
        prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { archivedAt: null, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    discountLimitPercent(),
  ]);

  async function action(formData: FormData) {
    "use server";
    const result = await createOrder(formData);
    if ("error" in result && result.error) return;
    if (result.ok && result.id) redirect(`/orders/${result.id}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 4</p>
        <h1 className="mt-1 text-2xl font-semibold">Новый заказ</h1>
      </div>
      <SalesNav current="orders" />
      {customers.length === 0 ? (
        <p className="text-sm text-slate-600">Сначала создайте клиента в CRM.</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-slate-600">Сначала добавьте изделие.</p>
      ) : (
        <OrderForm
          action={action}
          customers={customers.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))}
          products={products.map((p: { id: string; name: string; minPrice: unknown; saleUnit: { symbol: string }; prices: { price: unknown }[] }) => ({
            id: p.id,
            name: p.name,
            minPrice: String(p.minPrice),
            saleSymbol: p.saleUnit.symbol,
            price: String(p.prices[0]?.price ?? "0"),
          }))}
          sellers={sellers}
          canChooseSeller={canChooseSeller}
          canDiscount={canDiscount}
          discountLimit={limit.toFixed(2)}
          defaultSellerId={session.user.id}
          leadId={lead?.id}
          defaultCustomerId={lead?.customerId ?? undefined}
        />
      )}
    </div>
  );
}
