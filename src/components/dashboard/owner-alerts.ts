import { D, moneyDisplay, qtyDisplay } from "@core/shared/decimal";
import { orderNo } from "@core/shared/format";

export type DashAlertTone = "critical" | "warning" | "info";

export type DashAlert = {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  amount?: string;
  tone: DashAlertTone;
};

type AlertOrder = {
  id: string;
  number: string | number;
  total: unknown;
  paidAmount: unknown;
  customer: { name: string };
};

type AlertMaterial = {
  id: string;
  name: string;
  minStock: unknown;
  storageUnit: { symbol: string };
  stockItems: { qtyOnHand: unknown }[];
};

export function buildOwnerDashAlerts({
  t,
  overdue,
  unpaid,
  criticalMaterials,
  purchaseNeedCount,
}: {
  t: (key: string, params?: Record<string, string>) => string;
  overdue: AlertOrder[];
  unpaid: AlertOrder[];
  criticalMaterials: AlertMaterial[];
  purchaseNeedCount: number;
}): DashAlert[] {
  const alerts: DashAlert[] = [];

  for (const o of overdue.slice(0, 4)) {
    alerts.push({
      id: `overdue-${o.id}`,
      href: `/orders/${o.id}`,
      title: `${orderNo(String(o.number))} · ${o.customer.name}`,
      subtitle: t("home.alert.overdue"),
      tone: "warning",
    });
  }

  for (const o of unpaid.filter((row) => D(String(row.total)).sub(String(row.paidAmount)).gt(0)).slice(0, 4)) {
    const due = D(String(o.total)).sub(String(o.paidAmount));
    alerts.push({
      id: `debt-${o.id}`,
      href: `/orders/${o.id}`,
      title: `${orderNo(String(o.number))} · ${o.customer.name}`,
      subtitle: t("home.needPay"),
      amount: `${moneyDisplay(due)} с`,
      tone: "critical",
    });
  }

  for (const m of criticalMaterials.slice(0, 3)) {
    const onHand = m.stockItems.reduce((s, i) => s.add(String(i.qtyOnHand)), D(0));
    alerts.push({
      id: `stock-${m.id}`,
      href: "/warehouse",
      title: m.name,
      subtitle: `${t("home.lowStock")} · ${qtyDisplay(onHand)} ${m.storageUnit.symbol}`,
      tone: "warning",
    });
  }

  if (purchaseNeedCount > 0) {
    alerts.push({
      id: "purchase",
      href: "/purchasing",
      title: t("home.alert.purchase"),
      subtitle: t("home.positions", { n: String(purchaseNeedCount) }),
      tone: "info",
    });
  }

  return alerts;
}

export function countOwnerAttention({
  overdueCount,
  unpaidCount,
  criticalCount,
  purchaseNeedCount,
}: {
  overdueCount: number;
  unpaidCount: number;
  criticalCount: number;
  purchaseNeedCount: number;
}) {
  return overdueCount + unpaidCount + criticalCount + purchaseNeedCount;
}
