export type OrderPeriod = "today" | "week" | "month" | "3m" | "prev" | "all" | "custom";

export type FinancePeriod = "month" | "prev" | "2m" | "3m" | "quarter" | "year" | "all";

export const FINANCE_PERIODS: FinancePeriod[] = ["month", "prev", "2m", "3m", "quarter", "year", "all"];

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
  const period = (params.period as OrderPeriod) || "today";
  if (period === "all") return { period: "all" };

  if (period === "custom") {
    const fromRaw = parseInputDate(params.from);
    if (!fromRaw) return { period: "all" };
    const toRaw = parseInputDate(params.to) ?? fromRaw;
    return { from: startOfDay(fromRaw), to: endOfDay(toRaw), period: "custom" };
  }

  const now = new Date();
  if (period === "today") {
    return { from: startOfDay(now), to: endOfDay(now), period: "today" };
  }

  if (period === "week") {
    const day = now.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const from = new Date(now);
    from.setDate(now.getDate() + mondayOffset);
    return { from: startOfDay(from), to: endOfDay(now), period: "week" };
  }

  if (period === "prev") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: startOfDay(from), to: endOfDay(to), period: "prev" };
  }

  if (period === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return { from: startOfDay(from), to: endOfDay(now), period: "3m" };
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
  if (period === "today") return t("orders.periodToday");
  if (period === "week") return t("orders.periodWeek");
  if (period === "month") return t("orders.periodMonth");
  if (period === "3m") return t("orders.period3m");
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

export function resolveFinanceDateRange(periodRaw?: string): {
  period: FinancePeriod;
  from?: Date;
  to?: Date;
  prevFrom?: Date;
  prevTo?: Date;
} {
  const period = (FINANCE_PERIODS.includes(periodRaw as FinancePeriod) ? periodRaw : "month") as FinancePeriod;
  const now = new Date();

  if (period === "all") return { period };

  if (period === "prev") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevTo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return {
      period,
      from: startOfDay(from),
      to: endOfDay(to),
      prevFrom: startOfDay(prevFrom),
      prevTo: endOfDay(prevTo),
    };
  }

  if (period === "2m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const prevTo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    return {
      period,
      from: startOfDay(from),
      to: endOfDay(now),
      prevFrom: startOfDay(prevFrom),
      prevTo: endOfDay(prevTo),
    };
  }

  if (period === "3m") {
    const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const prevTo = new Date(now.getFullYear(), now.getMonth() - 2, 0);
    return {
      period,
      from: startOfDay(from),
      to: endOfDay(now),
      prevFrom: startOfDay(prevFrom),
      prevTo: endOfDay(prevTo),
    };
  }

  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    const from = new Date(now.getFullYear(), q * 3, 1);
    const prevFrom = new Date(now.getFullYear(), (q - 1) * 3, 1);
    const prevTo = new Date(now.getFullYear(), q * 3, 0);
    return {
      period,
      from: startOfDay(from),
      to: endOfDay(now),
      prevFrom: startOfDay(prevFrom),
      prevTo: endOfDay(prevTo),
    };
  }

  if (period === "year") {
    const from = new Date(now.getFullYear(), 0, 1);
    const prevFrom = new Date(now.getFullYear() - 1, 0, 1);
    const prevTo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    return {
      period,
      from: startOfDay(from),
      to: endOfDay(now),
      prevFrom: startOfDay(prevFrom),
      prevTo: endOfDay(prevTo),
    };
  }

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevTo = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    period: "month",
    from: startOfDay(from),
    to: endOfDay(now),
    prevFrom: startOfDay(prevFrom),
    prevTo: endOfDay(prevTo),
  };
}

export function financePeriodLabel(period: FinancePeriod, t: (key: string) => string) {
  switch (period) {
    case "month":
      return t("home.periodMonth");
    case "prev":
      return t("home.periodPrev");
    case "2m":
      return t("home.period2m");
    case "3m":
      return t("home.period3m");
    case "quarter":
      return t("home.periodQuarter");
    case "year":
      return t("home.periodYear");
    case "all":
      return t("home.periodAll");
    default:
      return t("home.periodMonth");
  }
}

export function financePeriodCompareHint(period: FinancePeriod, t: (key: string) => string) {
  switch (period) {
    case "year":
      return t("home.vsPrevYear");
    case "quarter":
      return t("home.vsPrevQuarter");
    case "all":
      return t("home.vsAll");
    default:
      return t("home.vsPrev");
  }
}
