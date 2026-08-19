import { ClipboardList, Factory, Box, Warehouse } from "lucide-react";
import { prisma } from "@core/infrastructure/prisma";
import { requireSession } from "@core/auth/authz";
import { D, qtyDisplay } from "@core/shared/decimal";
import { findFinishedGoodsWarehouse } from "@core/config/resolve-warehouse";
import { getTranslator } from "@core/shared/i18n/locale";
import { ORDER_STATUS } from "@core/orders/orders";
import { DashGreeting, DashMetricStrip } from "@/components/dashboard/dashboard-system";
import styles from "@/components/dashboard/dash-home.module.css";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function pctChange(today: ReturnType<typeof D>, yesterday: ReturnType<typeof D>) {
  if (yesterday.lte(0)) {
    if (today.lte(0)) return null;
    return 100;
  }
  return today.sub(yesterday).div(yesterday).mul(100).toDecimalPlaces(0).toNumber();
}

export async function MobileOwnerHome() {
  await requireSession();
  const { t } = await getTranslator();

  const todayStart = startOfDay();
  const todayEnd = endOfDay();
  const yesterdayStart = startOfDay(new Date(Date.now() - 86_400_000));
  const yesterdayEnd = endOfDay(new Date(Date.now() - 86_400_000));

  const activeOrderWhere = {
    status: { code: { notIn: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED, ORDER_STATUS.ISSUED] } },
  };

  const [ordersInWork, ordersToday, inProduction, fgStock, producedToday, producedYesterday] =
    await Promise.all([
      prisma.order.count({ where: activeOrderWhere }),
      prisma.order.count({
        where: { ...activeOrderWhere, createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.productionOrder.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
      findFinishedGoodsWarehouse().then(async (wh) => {
        if (!wh) return [];
        return prisma.stockItem.findMany({
          where: { warehouseId: wh.id, productId: { not: null }, materialId: null },
        });
      }),
      prisma.productionBatch.aggregate({
        where: { status: "CLOSED", producedAt: { gte: todayStart, lte: todayEnd } },
        _sum: { actualQty: true },
      }),
      prisma.productionBatch.aggregate({
        where: { status: "CLOSED", producedAt: { gte: yesterdayStart, lte: yesterdayEnd } },
        _sum: { actualQty: true },
      }),
    ]);

  const fgTotal = fgStock.reduce((s, row) => s.add(String(row.qtyOnHand)), D(0));
  const todayQty = D(String(producedToday._sum.actualQty ?? 0));
  const yesterdayQty = D(String(producedYesterday._sum.actualQty ?? 0));
  const changePct = pctChange(todayQty, yesterdayQty);

  let producedHint = t("home.kpi.noChangeToday");
  let producedHintTone: "positive" | "neutral" = "neutral";
  if (changePct !== null && changePct > 0) {
    producedHint = t("home.kpi.vsYesterdayUp").replace("{pct}", String(changePct));
    producedHintTone = "positive";
  } else if (changePct !== null && changePct < 0) {
    producedHint = t("home.kpi.vsYesterdayDown").replace("{pct}", String(Math.abs(changePct)));
  }

  return (
    <div className={`${styles.home} ${styles.homeMobile}`}>
      <DashGreeting t={t} />

      <DashMetricStrip
        variant="compact"
        tour="home-income"
        metrics={[
          {
            id: "orders",
            tone: "orange",
            icon: ClipboardList,
            label: t("home.kpi.ordersInWork"),
            value: String(ordersInWork),
            hint: ordersToday > 0 ? t("home.kpi.ordersTodayDelta").replace("{n}", String(ordersToday)) : undefined,
            hintTone: ordersToday > 0 ? "positive" : "neutral",
          },
          {
            id: "production",
            tone: "green",
            icon: Factory,
            label: t("home.inProduction"),
            value: String(inProduction),
            hint: t("home.kpi.inProcess"),
          },
          {
            id: "fg",
            tone: "blue",
            icon: Box,
            label: t("home.kpi.finishedGoods"),
            value: qtyDisplay(fgTotal),
            hint: t("home.kpi.onStock"),
          },
          {
            id: "today",
            tone: "purple",
            icon: Warehouse,
            label: t("home.kpi.producedToday"),
            value: `${qtyDisplay(todayQty)} м²`,
            hint: producedHint,
            hintTone: producedHintTone,
          },
        ]}
      />
    </div>
  );
}
