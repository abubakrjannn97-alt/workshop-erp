import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { hasPermission } from "@/lib/authz";
import { SalesNav } from "@/components/sales-nav";
import { PendingButton } from "@/components/pending-button";
import { D, moneyDisplay, qtyDisplay } from "@/lib/decimal";
import { available } from "@/lib/stock";
import { PAYMENT_METHODS, PAYMENT_STATUS, STATUS_FLOW } from "@/lib/orders";
import {
  addPayment,
  cancelOrder,
  confirmOrder,
  createPurchaseFromDeficit,
  issueOrderToCustomer,
  reversePayment,
  updateOrderStatus,
} from "@/app/actions/orders";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("orders.view");
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      seller: true,
      status: true,
      items: { include: { product: { include: { saleUnit: true, outputUnit: true } } } },
      materials: { include: { material: { include: { storageUnit: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      production: true,
    },
  });
  if (!order) notFound();
  if (session.user.roleCode === "sales_manager" && order.sellerId !== session.user.id) {
    redirect("/orders");
  }

  const canCreate = hasPermission(session.user.permissions, session.user.roleCode, "orders.create");
  const canCancel = hasPermission(session.user.permissions, session.user.roleCode, "orders.cancel");
  const canPay = hasPermission(session.user.permissions, session.user.roleCode, "payments.create");
  const canSeeCost = hasPermission(session.user.permissions, session.user.roleCode, "materials.view");
  const canPurchase = hasPermission(session.user.permissions, session.user.roleCode, "purchasing.manage");
  const canIssue = hasPermission(session.user.permissions, session.user.roleCode, "inventory.receive");
  const nextCodes = STATUS_FLOW[order.status.code] ?? [];
  const nextStatuses = await prisma.orderStatus.findMany({
    where: { code: { in: nextCodes } },
    orderBy: { sortOrder: "asc" },
  });

  const raw = await prisma.warehouse.findUnique({ where: { code: "RAW" } });
  const stock = raw
    ? await prisma.stockItem.findMany({
        where: { warehouseId: raw.id, materialId: { in: order.materials.map((m) => m.materialId) } },
      })
    : [];
  const stockMap = new Map(stock.map((s) => [s.materialId, s]));
  const deficits = order.materials
    .map((need) => {
      const item = stockMap.get(need.materialId);
      const avail = item ? available(item.qtyOnHand, item.qtyReserved) : D(0);
      const reserved = D(String(need.reservedQty));
      const planned = D(String(need.plannedQty));
      const short = order.confirmedAt
        ? planned.sub(reserved)
        : planned.gt(avail)
          ? planned.sub(avail)
          : D(0);
      return { need, avail, short, reserved };
    })
    .filter((row) => row.short.gt(0));

  const debt = D(String(order.total)).sub(order.paidAmount);
  const margin =
    canSeeCost && order.materialCost ? D(String(order.total)).sub(order.materialCost) : null;

  async function confirmAction(formData: FormData) {
    "use server";
    await confirmOrder(formData);
  }
  async function cancelAction(formData: FormData) {
    "use server";
    await cancelOrder(formData);
  }
  async function statusAction(formData: FormData) {
    "use server";
    await updateOrderStatus(formData);
  }
  async function payAction(formData: FormData) {
    "use server";
    await addPayment(formData);
  }
  async function reverseAction(formData: FormData) {
    "use server";
    await reversePayment(formData);
  }
  async function deficitAction(formData: FormData) {
    "use server";
    const result = await createPurchaseFromDeficit(formData);
    if (result.ok && result.id) redirect(`/purchasing/${result.id}`);
  }
  async function issueAction(formData: FormData) {
    "use server";
    await issueOrderToCustomer(formData);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-teal-800">PHASE 4</p>
        <h1 className="mt-1 text-2xl font-semibold">Заказ #{order.number}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {order.customer.name} · {order.status.name} ·{" "}
          {PAYMENT_STATUS[order.paymentStatus as keyof typeof PAYMENT_STATUS] ?? order.paymentStatus}
        </p>
        <p className="mt-2 flex gap-3 text-sm">
          <Link href={`/orders/${order.id}/print?doc=order`} className="text-teal-800 hover:underline">
            Заказ
          </Link>
          <Link href={`/orders/${order.id}/print?doc=invoice`} className="text-teal-800 hover:underline">
            Счёт
          </Link>
          <Link href={`/orders/${order.id}/print?doc=receipt`} className="text-teal-800 hover:underline">
            Квитанция
          </Link>
          <Link href={`/orders/${order.id}/print?doc=waybill`} className="text-teal-800 hover:underline">
            Накладная
          </Link>
          <a href={`/api/export/order?id=${order.id}`} className="text-teal-800 hover:underline">
            CSV
          </a>
          <a href={`/api/export/order?id=${order.id}&format=xls`} className="text-teal-800 hover:underline">
            Excel
          </a>
        </p>
      </div>
      <SalesNav current="orders" />

      <div className="grid gap-4 sm:grid-cols-4">
        <Card label="Сумма" value={`${moneyDisplay(order.total)} с`} />
        <Card label="Оплачено" value={`${moneyDisplay(order.paidAmount)} с`} />
        <Card label="Долг" value={`${moneyDisplay(debt)} с`} />
        <Card
          label="Маржа по сырью"
          value={margin ? `${moneyDisplay(margin)} с` : canSeeCost ? "нет себестоимости" : "скрыто"}
        />
      </div>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Позиции</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-4">
              <span>
                {item.product.name}: {qtyDisplay(item.quantity)} {item.product.saleUnit.symbol} →{" "}
                {qtyDisplay(item.outputQty)} {item.product.outputUnit.symbol}
              </span>
              <span className="font-mono text-xs">
                {moneyDisplay(item.unitPrice)} × {qtyDisplay(item.quantity)} = {moneyDisplay(item.amount)} с
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Скидка {qtyDisplay(order.discountPercent)}% (−{moneyDisplay(order.discountAmount)} с). Цена и рецептура
          зафиксированы на момент создания.
        </p>
      </section>

      <section className="rounded-2xl border border-[var(--line)] bg-white p-5">
        <h2 className="text-sm font-semibold">Сырьё (snapshot)</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {order.materials.map((need) => (
            <li key={need.id} className="flex justify-between gap-4">
              <span>
                {need.material.name}: план {qtyDisplay(need.plannedQty)} {need.material.storageUnit.symbol}, резерв{" "}
                {qtyDisplay(need.reservedQty)}
              </span>
              <span className="font-mono text-xs">
                {canSeeCost && need.lineCost ? `${moneyDisplay(need.lineCost)} с` : "—"}
              </span>
            </li>
          ))}
        </ul>
        {!order.canProduceFully && order.confirmedAt ? (
          <p className="mt-3 text-sm text-amber-800">
            Заказ #{order.number} невозможно полностью произвести.
          </p>
        ) : null}
        {deficits.length > 0 ? (
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm">
            <p className="font-medium">Не хватает:</p>
            <ul className="mt-1 list-disc pl-5">
              {deficits.map((row) => (
                <li key={row.need.id}>
                  {row.need.material.name} — {qtyDisplay(row.short)} {row.need.material.storageUnit.symbol}
                </li>
              ))}
            </ul>
            {canPurchase ? (
              <form action={deficitAction} className="mt-2">
                <input type="hidden" name="orderId" value={order.id} />
                <button className="text-sm font-medium text-teal-800 hover:underline">
                  Создать заявку на закупку
                </button>
              </form>
            ) : (
              <Link href="/purchasing" className="mt-2 inline-block text-sm text-teal-800">
                Открыть закупки
              </Link>
            )}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">Действия</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {canCreate && (order.status.code === "NEW" || order.status.code === "AWAITING_PAYMENT") ? (
              <form action={confirmAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Подтвердить</button>
              </form>
            ) : null}
            {canCreate && nextStatuses.length > 0
              ? nextStatuses.map((s) => (
                  <form action={statusAction} key={s.id}>
                    <input type="hidden" name="id" value={order.id} />
                    <input type="hidden" name="statusCode" value={s.code} />
                    <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm">{s.name}</button>
                  </form>
                ))
              : null}
            {canIssue && (order.status.code === "IN_FG" || order.status.code === "READY") ? (
              <form action={issueAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">Выдать клиенту</button>
              </form>
            ) : null}
            {canCancel && order.status.code !== "CANCELLED" ? (
              <form action={cancelAction}>
                <input type="hidden" name="id" value={order.id} />
                <button className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-800">Отменить</button>
              </form>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Зарплата начисляется по годным м² партии, комиссия — с фактической оплаты.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
          <h2 className="text-sm font-semibold">Оплаты</h2>
          {canPay ? (
            <form action={payAction} className="mt-3 grid gap-2 sm:grid-cols-2">
              <input type="hidden" name="orderId" value={order.id} />
              <input type="hidden" name="idempotencyKey" value={randomUUID()} />
              <input
                name="amount"
                placeholder="Сумма"
                defaultValue={debt.gt(0) ? moneyDisplay(debt) : ""}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <select name="method" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
              <input
                name="comment"
                placeholder="Комментарий"
                className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <PendingButton className="rounded-lg bg-teal-800 px-3 py-2 text-sm text-white">
                Принять оплату
              </PendingButton>
            </form>
          ) : null}
          <ul className="mt-3 space-y-2 text-sm">
            {order.payments.length === 0 ? (
              <li className="text-slate-500">Оплат нет.</li>
            ) : (
              order.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span>
                    {moneyDisplay(p.amount)} с · {p.method ?? "—"} · {p.createdAt.toLocaleString("ru-RU")}
                    {p.reversesId ? " · сторно" : ""}
                  </span>
                  {canPay && !p.reversesId && !order.payments.some((x) => x.reversesId === p.id) ? (
                    <form action={reverseAction}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <button className="text-xs text-red-800 hover:underline">Сторно</button>
                    </form>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </div>
      </section>

      <p className="text-sm">
        <Link href={`/crm/customers/${order.customerId}`} className="text-teal-800 hover:underline">
          Карточка клиента
        </Link>
        {order.production ? (
          <>
            {" · "}
            <Link href={`/production/${order.production.id}`} className="text-teal-800 hover:underline">
              Производство
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}
