import { getTranslator } from "@core/shared/i18n/locale";
import { redirect } from "next/navigation";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { hasPermission } from "@core/auth/authz";
import { createOrder, createMultiItemOrder } from "@/app/actions/orders";
import { OrderForm } from "../order-form";
import { discountLimitPercent } from "@core/orders/orders";
import { PageHeader } from "@/components/page-header";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ leadId?: string; customerId?: string }>;
}) {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("orders.create");
  const { leadId, customerId: customerIdParam } = await searchParams;
  const lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;
  const canDiscount = hasPermission(session.user.permissions, session.user.roleCode, "orders.discount");
  const canChooseSeller = session.user.roleCode !== "sales_manager";
  const canAddCustomer = hasPermission(session.user.permissions, session.user.roleCode, "crm.manage");

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
    const isMulti = formData.get("_multi") === "1";
    const result = isMulti ? await createMultiItemOrder(formData) : await createOrder(formData);
    if ("error" in result && result.error) return;
    if (result.ok && result.id) redirect(`/orders/${result.id}`);
  }

  return (
    <div className="page-stack" style={{ gap: "12px" }}>
      <PageHeader title={t("sales.newOrder")} backHref="/orders" backLabel={t("common.back")} />
      {products.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">{t("orders.needProduct")}</p>
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
          defaultCustomerId={customerIdParam ?? lead?.customerId ?? undefined}
          canAddCustomer={canAddCustomer}
          locale={locale}
        />
      )}
    </div>
  );
}
