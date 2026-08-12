import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { FUND, LEDGER, fundDelta } from "@/lib/finance";
import { contributionAndNet } from "@/lib/profit";
import { coverageAndPurchaseNeed } from "@/lib/alerts";

export default async function AnalyticsPage() {
  await requirePermission("analytics.view");
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    monthOrders,
    unpaid,
    overdue,
    inProd,
    lowMaterials,
    rawItems,
    scraps,
    accruals,
    funds,
    entries,
    purchaseOrders,
    overUses,
    scrapsFull,
    cover,
    productItems,
    prodScheme,
  ] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { payments: true },
    }),
    prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
    }),
    prisma.order.findMany({
      where: {
        dueAt: { lt: new Date() },
        status: { code: { notIn: ["COMPLETED", "CANCELLED", "ISSUED"] } },
      },
      include: { customer: true, status: true },
    }),
    prisma.productionOrder.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      include: { order: { include: { items: { include: { product: true } } } } },
    }),
    prisma.material.findMany({
      where: { archivedAt: null, isActive: true },
      include: { storageUnit: true, stockItems: true },
    }),
    prisma.stockItem.findMany({
      where: { warehouse: { code: "RAW" }, materialId: { not: null } },
      include: { material: true },
    }),
    prisma.scrapRecord.findMany({ where: { createdAt: { gte: monthStart } } }),
    prisma.payrollAccrual.groupBy({
      by: ["kind"],
      where: { status: "ACCRUED" },
      _sum: { amount: true },
    }),
    prisma.financialFund.findMany(),
    prisma.ledgerEntry.findMany({ where: { status: "POSTED" } }),
    prisma.purchaseOrder.findMany({ where: { status: { not: "CANCELLED" } } }),
    prisma.batchMaterialUse.findMany({
      where: { batch: { status: "CLOSED" } },
      include: { material: true, batch: { include: { production: { include: { order: true } } } } },
    }),
    prisma.scrapRecord.findMany({
      where: { createdAt: { gte: monthStart } },
      include: {
        batch: {
          include: {
            production: { include: { order: { include: { items: { include: { product: true } } } } } },
          },
        },
      },
    }),
    coverageAndPurchaseNeed(),
    prisma.orderItem.findMany({
      where: {
        order: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      },
      include: {
        product: true,
        order: {
          include: {
            materials: true,
            payments: true,
            seller: { include: { payScheme: { include: { tiers: true } } } },
          },
        },
      },
    }),
    prisma.payScheme.findUnique({ where: { code: "production_m2" } }),
  ]);

  const sold = monthOrders.reduce((s, o) => s.add(String(o.total)), D(0));
  const received = monthOrders.reduce(
    (s, o) => s.add(o.payments.reduce((p, pay) => p.add(String(pay.amount)), D(0))),
    D(0),
  );
  const clientDebt = unpaid.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const weOwe = purchaseOrders.reduce((s, o) => s.add(D(String(o.total)).sub(o.paidAmount)), D(0));
  const profitFund = funds.find((f) => f.code === FUND.PROFIT);
  const profit = profitFund
    ? entries.reduce((s, e) => s.add(fundDelta(e, profitFund.id)), D(0))
    : D(0);
  const labor = D(String(accruals.find((a) => a.kind === "PRODUCTION")?._sum.amount ?? 0));
  const commission = D(String(accruals.find((a) => a.kind === "COMMISSION")?._sum.amount ?? 0));
  const scrapQty = scraps.reduce((s, r) => s.add(String(r.quantity)), D(0));
  const scrapCost = scraps.reduce((s, r) => s.add(String(r.materialCost ?? 0)), D(0));
  const critical = lowMaterials.filter((m) => {
    const onHand = m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0));
    return onHand.lte(m.minStock);
  });
  const over = overUses.filter((u) => {
    const plan = D(String(u.plannedQty));
    return plan.gt(0) && D(String(u.actualQty)).sub(plan).div(plan).mul(100).gte(5);
  });
  const reserved = funds
    .filter((f) => f.code !== FUND.PROFIT)
    .reduce((s, f) => s.add(entries.reduce((e, row) => e.add(fundDelta(row, f.id)), D(0))), D(0));
  const materialCost = monthOrders.reduce((s, o) => s.add(String(o.materialCost ?? 0)), D(0));
  const expenses = entries
    .filter((e) => e.type === LEDGER.CASH_OUT && e.categoryId)
    .reduce((s, e) => s.add(String(e.amount)), D(0));
  const { contribution, net } = contributionAndNet({
    revenue: sold,
    materialCost,
    labor,
    commission,
    fixedExpenses: expenses,
  });
  const rate = D(String(prodScheme?.productionRate ?? "22"));

  type ProdRow = {
    name: string;
    qty: ReturnType<typeof D>;
    revenue: ReturnType<typeof D>;
    materials: ReturnType<typeof D>;
    labor: ReturnType<typeof D>;
    commission: ReturnType<typeof D>;
  };
  const byProduct = new Map<string, ProdRow>();
  for (const item of productItems) {
    const key = item.productId;
    const row =
      byProduct.get(key) ??
      ({
        name: item.product.name,
        qty: D(0),
        revenue: D(0),
        materials: D(0),
        labor: D(0),
        commission: D(0),
      } satisfies ProdRow);
    const qtySale = D(String(item.quantity));
    const amount = D(String(item.amount));
    row.qty = row.qty.add(qtySale);
    row.revenue = row.revenue.add(amount);
    const orderTotal = D(String(item.order.total));
    const share = orderTotal.gt(0) ? amount.div(orderTotal) : D(0);
    row.materials = row.materials.add(D(String(item.order.materialCost ?? 0)).mul(share));
    row.labor = row.labor.add(qtySale.mul(rate));
    const paid = item.order.payments.reduce((s, p) => s.add(String(p.amount)), D(0));
    const paidShare = orderTotal.gt(0) ? paid.mul(share) : D(0);
    // комиссия приблизительно 3% с доли оплат (точная по тирам — в payroll)
    row.commission = row.commission.add(paidShare.mul("0.03"));
    byProduct.set(key, row);
  }

  const scrapByUser = new Map<string, ReturnType<typeof D>>();
  const scrapByProduct = new Map<string, ReturnType<typeof D>>();
  for (const r of scrapsFull) {
    const q = D(String(r.quantity));
    if (r.userId) scrapByUser.set(r.userId, (scrapByUser.get(r.userId) ?? D(0)).add(q));
    const pname = r.batch.production.order.items[0]?.product.name ?? "—";
    scrapByProduct.set(pname, (scrapByProduct.get(pname) ?? D(0)).add(q));
  }
  const users = scrapByUser.size
    ? await prisma.user.findMany({ where: { id: { in: [...scrapByUser.keys()] } } })
    : [];
  const userName = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 9</p>
        <h1 className="mt-1 text-2xl font-semibold">Аналитика владельца</h1>
        <p className="mt-2 flex flex-wrap gap-3 text-sm">
          <a href="/api/export/sales" className="text-teal-800 hover:underline">Продажи CSV</a>
          <a href="/api/export/sales?format=xls" className="text-teal-800 hover:underline">Excel</a>
          <a href="/api/export/warehouse" className="text-teal-800 hover:underline">Склад CSV</a>
          <a href="/api/export/payroll" className="text-teal-800 hover:underline">Зарплаты CSV</a>
          <a href="/api/export/profit" className="text-teal-800 hover:underline">Прибыль CSV</a>
          <a href="/api/export/debts" className="text-teal-800 hover:underline">Долги CSV</a>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat href="/sales" label="Продали за месяц" value={`${moneyDisplay(sold)} с`} />
        <Stat href="/sales" label="Реально получили" value={`${moneyDisplay(received)} с`} />
        <Stat href="/sales" label="Должны клиенты" value={`${moneyDisplay(clientDebt)} с`} />
        <Stat href="/purchasing" label="Должны мы" value={`${moneyDisplay(weOwe)} с`} />
        <Stat
          href="/finance"
          label="Маржинальная прибыль (без постоянных расходов)"
          value={`${moneyDisplay(contribution)} с`}
        />
        <Stat
          href="/finance"
          label="Чистая прибыль (после всех расходов)"
          value={`${moneyDisplay(net)} с`}
        />
        <Stat href="/finance" label="Фонд доступной прибыли" value={`${moneyDisplay(profit)} с`} />
        <Stat href="/finance" label="Зарезервировано" value={`${moneyDisplay(reserved)} с`} />
        <Stat href="/employees" label="Начислено рабочим" value={`${moneyDisplay(labor)} с`} />
        <Stat href="/employees" label="Начислено продавцам" value={`${moneyDisplay(commission)} с`} />
        <Stat href="/production" label="Брак за месяц" value={`${qtyDisplay(scrapQty)} / ${moneyDisplay(scrapCost)} с`} />
        <Stat
          href="/warehouse"
          label="Сырья хватит на"
          value={cover.coverQty ? `${cover.coverQty} (${cover.productName ?? ""})` : "—"}
        />
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Итог продажи (из операций)</h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>Продажа: {moneyDisplay(sold)} с</li>
          <li>Себестоимость сырья: {moneyDisplay(materialCost)} с</li>
          <li>Зарплаты: {moneyDisplay(labor)} с</li>
          <li>Комиссия: {moneyDisplay(commission)} с</li>
          <li>Маржинальная прибыль: {moneyDisplay(contribution)} с</li>
          <li>Постоянные расходы: {moneyDisplay(expenses)} с</li>
          <li className="font-semibold">Чистая прибыль: {moneyDisplay(net)} с</li>
          <li className="text-xs text-slate-500">Фонд прибыли в кассе: {moneyDisplay(profit)} с</li>
        </ul>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-white">
        <div className="border-b border-[var(--line)] px-5 py-3">
          <h2 className="text-sm font-semibold">По продукции (месяц)</h2>
          <p className="text-xs text-slate-500">TZ §44 — что реально приносит деньги</p>
        </div>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2">Изделие</th>
              <th className="px-4 py-2">Продано</th>
              <th className="px-4 py-2">Выручка</th>
              <th className="px-4 py-2">Ср. цена</th>
              <th className="px-4 py-2">Материалы</th>
              <th className="px-4 py-2">Труд</th>
              <th className="px-4 py-2">Комиссия</th>
              <th className="px-4 py-2">Себест.</th>
              <th className="px-4 py-2">Прибыль</th>
              <th className="px-4 py-2">Маржа %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[...byProduct.values()].length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-6 text-slate-500">
                  Нет продаж за месяц.
                </td>
              </tr>
            ) : (
              [...byProduct.values()].map((row) => {
                const fullCost = row.materials.add(row.labor).add(row.commission);
                const profitRow = row.revenue.sub(fullCost);
                const margin = row.revenue.gt(0) ? profitRow.div(row.revenue).mul(100) : D(0);
                const avg = row.qty.gt(0) ? row.revenue.div(row.qty) : D(0);
                return (
                  <tr key={row.name}>
                    <td className="px-4 py-2 font-medium">{row.name}</td>
                    <td className="px-4 py-2 font-mono text-xs">{qtyDisplay(row.qty)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.revenue)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(avg)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.materials)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.labor)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(row.commission)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(fullCost)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{moneyDisplay(profitRow)}</td>
                    <td className="px-4 py-2 font-mono text-xs">{margin.toFixed(1)}%</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      {cover.purchaseNeed.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold">Необходимо закупить</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {cover.purchaseNeed.map((n) => (
              <li key={n.name}>
                {n.name}: {n.qty} {n.symbol}
              </li>
            ))}
          </ul>
          <Link href="/purchasing" className="mt-2 inline-block text-sm text-teal-800">
            Закупки
          </Link>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Сейчас в производстве</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {inProd.length === 0 ? (
            <li className="text-slate-500">Нет открытых заданий.</li>
          ) : (
            inProd.map((j) => (
              <li key={j.id}>
                <Link href={`/production/${j.id}`} className="text-teal-800 hover:underline">
                  #{j.order.number}
                </Link>{" "}
                {j.order.items[0]?.product.name} · {qtyDisplay(j.producedQty)} / {qtyDisplay(j.plannedQty)}
              </li>
            ))
          )}
        </ul>
      </section>

      {overdue.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold">Опаздывают</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {overdue.map((o) => (
              <li key={o.id}>
                <Link href={`/orders/${o.id}`} className="text-teal-800 hover:underline">
                  #{o.number}
                </Link>{" "}
                {o.customer.name} · {o.status.name}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Сырьё / критический остаток</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {critical.length === 0 ? (
            <li className="text-slate-500">Ниже минимума нет.</li>
          ) : (
            critical.map((m) => (
              <li key={m.id}>
                {m.name}: {qtyDisplay(m.stockItems.reduce((s, i) => s.add(i.qtyOnHand), D(0)))}{" "}
                {m.storageUnit.symbol}
              </li>
            ))
          )}
        </ul>
        <p className="mt-2 text-xs text-slate-500">
          Позиций на складе сырья: {rawItems.length}. Закупка — из дефицита заказа.
        </p>
      </section>

      {over.length > 0 ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold">Перерасход план/факт</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {over.slice(0, 20).map((u) => (
              <li key={u.id}>
                Заказ #{u.batch.production.order.number}: {u.material.name} план {qtyDisplay(u.plannedQty)}, факт{" "}
                {qtyDisplay(u.actualQty)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Брак по сотрудникам / изделиям / месяцу</h2>
        <p className="mt-1 text-xs text-slate-500">Период: текущий месяц</p>
        <ul className="mt-2 space-y-1 text-sm">
          {[...scrapByUser.entries()].map(([id, q]) => (
            <li key={id}>
              {userName.get(id) ?? id}: {qtyDisplay(q)}
            </li>
          ))}
          {[...scrapByProduct.entries()].map(([name, q]) => (
            <li key={name}>
              {name}: {qtyDisplay(q)}
            </li>
          ))}
          {scrapByUser.size === 0 && scrapByProduct.size === 0 ? (
            <li className="text-slate-500">Брака нет.</li>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="rounded-2xl border border-[var(--line)] bg-white p-5 hover:border-teal-700">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </Link>
  );
}
