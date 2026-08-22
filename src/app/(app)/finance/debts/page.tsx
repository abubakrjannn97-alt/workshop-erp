import { prisma } from "@core/infrastructure/prisma";
import { requirePermission } from "@core/auth/authz";
import { D, money, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { fetchFinanceDashboardData } from "@core/finance/finance-summary";
import { getTranslator } from "@core/shared/i18n/locale";
import { formatPurchaseOrderNo, shortProductLabel } from "@core/shared/format";
import { PageHeader } from "@/components/page-header";
import { FinanceDebtsView } from "../finance-debts-view";
import styles from "../finance.module.css";

export default async function FinanceDebtsPage() {
  const { t, locale } = await getTranslator();
  await requirePermission("finance.view");

  const [data, orders] = await Promise.all([
    fetchFinanceDashboardData(),
    prisma.order.findMany({
      where: { status: { code: { not: "CANCELLED" } } },
      include: {
        customer: true,
        items: { include: { product: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const customerDebts = orders
    .map((o) => {
      const debt = D(String(o.total)).sub(String(o.paidAmount));
      return {
        id: o.id,
        name: o.customer.name,
        number: o.number,
        debt: money(debt),
        lines: o.items.map((item) => ({
          label: shortProductLabel(item.product.name),
          detail: qtyDisplay(item.quantity),
          amount: money(item.amount),
        })),
      };
    })
    .filter((o) => D(o.debt).gt(0))
    .sort((a, b) => (D(b.debt).gt(a.debt) ? 1 : -1));

  const supplierDebts = data.purchaseDebts
    .map((o) => {
      const debt = D(String(o.total)).sub(o.paidAmount);
      return {
        id: o.id,
        supplierName: o.supplier.name,
        orderNo: formatPurchaseOrderNo(o.number),
        debt: money(debt),
        total: money(o.total),
        lines: o.items.map((item) => ({
          label: item.material.name,
          detail: `${qtyDisplay(item.quantity)} ${item.material.storageUnit?.symbol ?? ""}`.trim(),
        })),
      };
    })
    .filter((o) => D(o.debt).gt(0))
    .sort((a, b) => (D(b.debt).gt(a.debt) ? 1 : -1));

  const customerTotal = customerDebts.reduce((s, o) => s.add(o.debt), D(0));
  const supplierTotal = supplierDebts.reduce((s, o) => s.add(o.debt), D(0));

  return (
    <div className={styles.page}>
      <PageHeader title={t("home.debtsShort")} backHref="/" backLabel={t("common.back")} />
      <FinanceDebtsView
        locale={locale}
        customerDebts={customerDebts}
        supplierDebts={supplierDebts}
        customerTotal={money(customerTotal)}
        supplierTotal={money(supplierTotal)}
      />
    </div>
  );
}
