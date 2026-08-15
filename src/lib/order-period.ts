export type OrderPeriod = "month" | "prev" | "all" | "custom";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function parseInputDate(raw?: string) {
  if (!raw) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function resolveOrderDateRange(params: {
  period?: string;
  from?: string;
  to?: string;
}): { from?: Date; to?: Date; period: OrderPeriod } {
  const period = (params.period as OrderPeriod) || "month";
  if (period === "all") return { period: "all" };

  if (period === "custom") {
    const fromRaw = parseInputDate(params.from);
    if (!fromRaw) return { period: "all" };
    const toRaw = parseInputDate(params.to) ?? fromRaw;
    return { from: startOfDay(fromRaw), to: endOfDay(toRaw), period: "custom" };
  }

  const now = new Date();
  if (period === "prev") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: startOfDay(from), to: endOfDay(to), period: "prev" };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: startOfDay(from), to: endOfDay(to), period: "month" };
}

export function orderPeriodLabel(
  period: OrderPeriod,
  t: (key: string) => string,
  from?: Date,
  to?: Date,
) {
  if (period === "all") return t("orders.periodAll");
  if (period === "month") return t("orders.periodMonth");
  if (period === "prev") return t("orders.periodPrev");
  if (from && to) {
    return `${from.toLocaleDateString()} — ${to.toLocaleDateString()}`;
  }
  return t("orders.periodCustom");
}

export const ORDERS_PAGE_SIZE = 50;

export function buildOrdersQuery(base: Record<string, string | undefined>) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}
