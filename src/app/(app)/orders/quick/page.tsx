import { getTranslator } from "@core/shared/i18n/locale";
import { prisma } from "@core/infrastructure/prisma";
import { requirePermission, hasPermission } from "@core/auth/authz";
import { getFgWarehouse } from "@core/config/resolve-warehouse";
import { available } from "@core/inventory/stock";
import { D, qtyDisplay } from "@core/shared/decimal";
import { PageHeader } from "@/components/page-header";
import { QuickSaleForm } from "./quick-sale-form";

export default async function QuickSalePage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("orders.create");
  const canIssue = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  if (!canIssue) {
    return (
      <div className="page-stack">
        <PageHeader title={t("sales.quickTitle")} backHref="/orders" backLabel={t("common.back")} />
        <p className="text-sm text-[var(--ink-2)]">{t("sales.quickNoIssue")}</p>
      </div>
    );
  }

  const fg = await getFgWarehouse();
  const [customers, products] = await Promise.all([
    prisma.customer.findMany({
      where: {
        archivedAt: null,
        ...(session.user.roleCode === "sales_manager" ? { managerId: session.user.id } : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, whatsapp: true },
    }),
    prisma.product.findMany({
      where: { archivedAt: null, isActive: true },
      include: {
        saleUnit: true,
        prices: { where: { validTo: null }, orderBy: { validFrom: "desc" }, take: 1 },
        stockItems: { where: { warehouseId: fg.id } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const sellable = products
    .map((p) => {
      const onHand = available(
        p.stockItems[0]?.qtyOnHand ?? 0,
        p.stockItems[0]?.qtyReserved ?? 0,
      );
      return {
        id: p.id,
        name: p.name,
        symbol: p.saleUnit.symbol,
        price: String(p.prices[0]?.price ?? p.minPrice ?? "0"),
        minPrice: String(p.minPrice ?? "0"),
        onHand: qtyDisplay(onHand),
        photoUrl: p.photoUrl,
        hasStock: D(String(onHand)).gt(0),
      };
    })
    .filter((p) => p.hasStock);

  return (
    <div className="page-stack" style={{ gap: 10 }}>
      <PageHeader title={t("sales.quickTitle")} backHref="/orders" backLabel={t("common.back")} />
      {sellable.length === 0 ? (
        <p className="text-sm text-[var(--ink-2)]">{t("sales.quickNoStock")}</p>
      ) : (
        <QuickSaleForm
          customers={customers}
          products={sellable}
          locale={locale}
          labels={{
            customerName: t("sales.quickCustomerName"),
            pickCustomer: t("sales.quickPickCustomer"),
            phone: t("sales.quickPhone"),
            product: t("common.product"),
            quantity: t("common.quantity"),
            unitPrice: t("sales.quickSalePrice"),
            minPrice: t("sales.quickMinPrice"),
            stock: t("common.stock"),
            fgStock: (n: string, u: string) => t("sales.quickFgStock", { n, u }),
            submit: t("sales.quickSubmit"),
            sending: t("common.sending"),
            pay: t("sales.quickPay"),
            paid: t("sales.quickPaid"),
            later: t("sales.quickLater"),
            partial: t("sales.quickPartial"),
            dueDate: t("sales.quickDueDate"),
            paidAmount: t("sales.quickPartialAmount"),
            noCustomers: t("sales.quickNoCustomers"),
          }}
        />
      )}
    </div>
  );
}
