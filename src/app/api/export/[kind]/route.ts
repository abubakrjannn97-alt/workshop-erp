import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@core/infrastructure/prisma";
import { hasPermission } from "@core/auth/authz";
import type { PermissionCode } from "@core/rbac/permissions";
import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";

function csv(rows: (string | number)[][]) {
  const body = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(";"),
    )
    .join("\r\n");
  return `\uFEFF${body}`;
}

function file(name: string, rows: (string | number)[][], excel = false) {
  const filename = excel ? name.replace(/\.csv$/i, ".xls") : name;
  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": excel
        ? "application/vnd.ms-excel; charset=utf-8"
        : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

async function guard(code: PermissionCode) {
  const session = await auth();
  if (!session?.user?.id) return null;
  if (!hasPermission(session.user.permissions, session.user.roleCode, code)) return null;
  const { bindWorkshopContext } = await import("@core/workshop/workshop-context");
  await bindWorkshopContext(session.user.id, session.user.roleCode ?? "employee");
  return session;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  const url = new URL(request.url);
  const excel = url.searchParams.get("format") === "xls";

  if (kind === "order") {
    const session = await guard("orders.view");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const id = url.searchParams.get("id") ?? "";
    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, items: { include: { product: true } }, status: true },
    });
    if (!order) return NextResponse.json({ error: "Не найден." }, { status: 404 });
    return file(`order-${order.number}.csv`, [
      ["Номер", "Клиент", "Статус", "Сумма", "Оплачено"],
      [order.number, order.customer.name, order.status.name, moneyDisplay(order.total), moneyDisplay(order.paidAmount)],
      [],
      ["Изделие", "Кол-во", "Цена", "Сумма"],
      ...order.items.map((i) => [
        i.product.name,
        qtyDisplay(i.quantity),
        moneyDisplay(i.unitPrice),
        moneyDisplay(i.amount),
      ]),
    ], excel);
  }

  if (kind === "sales") {
    const session = await guard("analytics.view");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true, status: true },
      orderBy: { number: "asc" },
    });
    return file("sales.csv", [
      ["Номер", "Клиент", "Статус", "Оплата", "Сумма", "Оплачено", "Долг", "Дата"],
      ...orders.map((o) => [
        o.number,
        o.customer.name,
        o.status.name,
        o.paymentStatus,
        moneyDisplay(o.total),
        moneyDisplay(o.paidAmount),
        moneyDisplay(D(String(o.total)).sub(o.paidAmount)),
        o.createdAt.toISOString().slice(0, 10),
      ]),
    ], excel);
  }

  if (kind === "warehouse") {
    const session = await guard("inventory.view");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const items = await prisma.stockItem.findMany({
      include: { material: { include: { storageUnit: true } }, product: { include: { saleUnit: true } }, warehouse: true },
    });
    return file("warehouse.csv", [
      ["Склад", "Позиция", "Остаток", "Резерв", "WAC"],
      ...items.map((i) => [
        i.warehouse.name,
        i.material?.name ?? i.product?.name ?? "—",
        qtyDisplay(i.qtyOnHand),
        qtyDisplay(i.qtyReserved),
        moneyDisplay(i.wacUnitCost),
      ]),
    ], excel);
  }

  if (kind === "payroll") {
    const session = await guard("salary.approve");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const rows = await prisma.payrollAccrual.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });
    return file("payroll.csv", [
      ["Сотрудник", "Вид", "Сумма", "Кол-во", "Период", "Статус"],
      ...rows.map((r) => [
        r.user.name,
        r.kind,
        moneyDisplay(r.amount),
        r.quantity ? qtyDisplay(r.quantity) : "",
        r.periodKey,
        r.status,
      ]),
    ], excel);
  }

  if (kind === "debts") {
    const session = await guard("orders.view");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const orders = await prisma.order.findMany({
      where: { paymentStatus: { in: ["unpaid", "partial"] }, status: { code: { not: "CANCELLED" } } },
      include: { customer: true },
    });
    return file("debts.csv", [
      ["Заказ", "Клиент", "Сумма", "Оплачено", "Долг"],
      ...orders.map((o) => [
        o.number,
        o.customer.name,
        moneyDisplay(o.total),
        moneyDisplay(o.paidAmount),
        moneyDisplay(D(String(o.total)).sub(o.paidAmount)),
      ]),
    ], excel);
  }

  if (kind === "profit") {
    const session = await guard("analytics.view");
    if (!session) return NextResponse.json({ error: "Нет доступа." }, { status: 403 });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { code: { not: "CANCELLED" } } },
    });
    return file("profit.csv", [
      ["Заказ", "Выручка", "Сырьё", "Маржа по сырью"],
      ...orders.map((o) => {
        const mat = o.materialCost ? D(String(o.materialCost)) : D(0);
        return [
          o.number,
          moneyDisplay(o.total),
          o.materialCost ? moneyDisplay(o.materialCost) : "",
          moneyDisplay(D(String(o.total)).sub(mat)),
        ];
      }),
    ], excel);
  }

  return NextResponse.json({ error: "Неизвестный отчёт." }, { status: 404 });
}
