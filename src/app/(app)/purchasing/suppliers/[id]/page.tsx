import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { moneyDisplay } from "@/lib/decimal";
import { D } from "@/lib/decimal";

export default async function SupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("suppliers.view");
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      materials: { include: { material: true } },
      orders: { include: { items: { include: { material: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!supplier) notFound();

  const turnover = supplier.orders.reduce((s, o) => s.add(o.total), D(0));
  const debt = supplier.orders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));

  const priceByMaterial = new Map<string, { name: string; prices: { date: Date; price: string }[] }>();
  for (const order of supplier.orders) {
    for (const item of order.items) {
      const cur = priceByMaterial.get(item.materialId) ?? { name: item.material.name, prices: [] };
      cur.prices.push({ date: order.createdAt, price: item.unitPrice.toString() });
      priceByMaterial.set(item.materialId, cur);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{supplier.name}</h1>
        <p className="text-sm text-slate-600">
          {supplier.phone ?? "нет телефона"} · {supplier.contact ?? "нет контакта"}
        </p>
        <p className="mt-2 font-mono text-sm">
          закупки {moneyDisplay(turnover)} с · долг {moneyDisplay(debt)} с
        </p>
      </div>
      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Изменение закупочной цены</h2>
        {[...priceByMaterial.values()].map((row) => {
          const first = D(row.prices[row.prices.length - 1]?.price ?? 0);
          const last = D(row.prices[0]?.price ?? 0);
          const growth = first.gt(0) ? last.sub(first).div(first).mul(100) : D(0);
          return (
            <div key={row.name} className="mt-3 text-sm">
              <p className="font-medium">{row.name}</p>
              <ul className="text-xs text-slate-600">
                {row.prices.map((p, i) => (
                  <li key={i}>
                    {p.date.toLocaleDateString("ru-RU")} — {moneyDisplay(p.price)} с/ед.
                  </li>
                ))}
              </ul>
              {row.prices.length > 1 ? <p className="text-xs">Изменение: {growth.toFixed(1)}%</p> : null}
            </div>
          );
        })}
      </section>
      <ul className="space-y-2 text-sm">
        {supplier.orders.map((o) => (
          <li key={o.id}>
            <Link href={`/purchasing/${o.id}`} className="hover:underline">
              {o.number} · {moneyDisplay(o.total)} с
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
