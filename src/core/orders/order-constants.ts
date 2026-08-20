/** Pure order constants — safe to import from client components (no Prisma). */

export const PAYMENT_STATUS = {
  unpaid: "Не оплачен",
  partial: "Частично",
  paid: "Оплачен",
  overpaid: "Переплата",
  refund: "Возврат",
} as const;

export const PAYMENT_METHODS = [
  { code: "cash", name: "Наличные" },
  { code: "bank", name: "Перевод" },
  { code: "card", name: "Карта" },
] as const;

export const LOST_REASONS = [
  { code: "expensive", name: "Дорого" },
  { code: "competitor", name: "Выбрал конкурента" },
  { code: "changed_mind", name: "Передумал" },
  { code: "no_money", name: "Нет денег" },
  { code: "no_answer", name: "Нет ответа" },
  { code: "other", name: "Другое" },
] as const;

export const ORDER_STATUS = {
  NEW: "NEW",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  SCHEDULED: "SCHEDULED",
  IN_PRODUCTION: "IN_PRODUCTION",
  READY: "READY",
  IN_FG: "IN_FG",
  ISSUED: "ISSUED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
  RETURN: "RETURN",
  PARTIAL: "PARTIAL",
  ON_HOLD: "ON_HOLD",
} as const;

export const STATUS_FLOW: Record<string, string[]> = {
  NEW: ["AWAITING_PAYMENT", "ON_HOLD"],
  AWAITING_PAYMENT: ["CONFIRMED", "ON_HOLD"],
  CONFIRMED: ["SCHEDULED", "IN_PRODUCTION", "ON_HOLD", "PARTIAL"],
  SCHEDULED: ["IN_PRODUCTION", "ON_HOLD"],
  IN_PRODUCTION: ["READY", "PARTIAL", "ON_HOLD"],
  READY: ["IN_FG", "ISSUED", "RETURN"],
  IN_FG: ["ISSUED", "RETURN"],
  ISSUED: ["COMPLETED", "RETURN"],
  PARTIAL: ["IN_PRODUCTION", "READY", "ON_HOLD"],
  ON_HOLD: ["CONFIRMED", "SCHEDULED", "AWAITING_PAYMENT"],
  COMPLETED: ["RETURN"],
  CANCELLED: [],
  RETURN: [],
};
