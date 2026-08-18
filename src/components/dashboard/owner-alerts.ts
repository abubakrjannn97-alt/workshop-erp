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
      title: `${t("home.alert.overdue")} ${orderNo(String(o.number))}`,
      subtitle: o.customer.name,
      tone: "warning",
    });
  }

  for (const o of unpaid.filter((row) => D(String(row.total)).sub(String(row.paidAmount)).gt(0)).slice(0, 4)) {
    const due = D(String(o.total)).sub(String(o.paidAmount));
    alerts.push({
      id: `debt-${o.id}`,
      href: `/orders/${o.id}`,
      title: `${t("home.alert.debt")} ${orderNo(String(o.number))}`,
      subtitle: o.customer.name,
      amount: `${moneyDisplay(due)} с`,
      tone: "critical",
    });
  }

  for (const m of criticalMaterials.slice(0, 3)) {
    const onHand = m.stockItems.reduce((s, i) => s.add(String(i.qtyOnHand)), D(0));
    alerts.push({
      id: `stock-${m.id}`,
      href: "/warehouse",
      title: t("home.alert.stock"),
      subtitle: `${m.name} · ${qtyDisplay(onHand)} ${m.storageUnit.symbol}`,
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
