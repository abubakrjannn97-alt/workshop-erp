import { getTranslator } from "@/lib/locale";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { createSupplier } from "@/app/actions/suppliers";
import { PurchaseOrderForm } from "./po-form";
import { moneyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";
import { PageHeader } from "@/components/page-header";

function poStatus(t: (k: string) => string, s: string) {
  const map: Record<string, string> = {
    REQUEST: t("po.REQUEST"),
    ORDERED: t("po.ORDERED"),
    POSTED: t("po.POSTED"),
    CANCELLED: t("po.CANCELLED"),
  };
  return map[s] ?? s;
}

export default async function PurchasingPage() {
  const { t, locale } = await getTranslator();
  const session = await requirePermission("purchasing.view");
  const canManage =
    session.user.roleCode === "owner" || session.user.permissions.includes("purchasing.manage");
  const canSuppliers =
    session.user.roleCode === "owner" || session.user.permissions.includes("suppliers.manage");

  const [orders, suppliers, materials] = await Promise.all([
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { supplier: true },
      take: 50,
    }),
    prisma.supplier.findMany({
      where: { archivedAt: null },
      include: { orders: true },
      orderBy: { name: "asc" },
    }),
    prisma.material.findMany({ where: { archivedAt: null, isActive: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="page-stack">
      <PageHeader title={t("page.purchasing")} description={t("po.hint")} />

      <section className="ui-card" data-tour="po-suppliers">
        <h2 className="text-sm font-semibold">{t("po.suppliers")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {suppliers.map((s) => {
            const turnover = s.orders.reduce((sum, o) => sum.add(o.total), D(0));
            const debt = s.orders.reduce((sum, o) => sum.add(D(String(o.total)).sub(o.paidAmount)), D(0));
            return (
              <li key={s.id} className="flex justify-between gap-4">
                <Link href={`/purchasing/suppliers/${s.id}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
                <span className="font-mono text-xs">
                  {t("po.purchasesDebt", { t: moneyDisplay(turnover), d: moneyDisplay(debt) })}
                </span>
              </li>
            );
          })}
        </ul>
        {canSuppliers ? (
          <form action={createSupplier} className="mt-4 grid gap-2 sm:grid-cols-4">
            <input name="name" required placeholder={t("common.name")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="phone" placeholder={t("common.phone")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <input name="contact" placeholder={t("common.contact")} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
            <button className="ui-btn-primary">{t("common.add")}</button>
          </form>
        ) : null}
      </section>

      {canManage ? (
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
          materials={materials.map((m) => ({ id: m.id, name: m.name }))}
          locale={locale}
        />
      ) : null}

      <div className="overflow-hidden ui-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">{t("common.number")}</th>
              <th className="px-4 py-3">{t("common.supplier")}</th>
              <th className="px-4 py-3">{t("common.status")}</th>
              <th className="px-4 py-3 text-right">{t("common.amount")}</th>
              <th className="px-4 py-3 text-right">{t("common.debt")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">
                  <Link href={`/purchasing/${o.id}`} className="font-medium hover:underline">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.supplier.name}</td>
                <td className="px-4 py-3">{poStatus(t, o.status) ?? o.status}</td>
                <td className="px-4 py-3 text-right font-mono text-xs">{moneyDisplay(o.total)} с</td>
                <td className="px-4 py-3 text-right font-mono text-xs">
                  {moneyDisplay(D(String(o.total)).sub(o.paidAmount))} с
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
