export type BadgeTone = "good" | "bad" | "warn" | "info" | "neutral";

export function StatusBadge({ label, tone = "neutral" }: { label: string; tone?: BadgeTone }) {
  return <span className={`st-badge st-${tone}`}>{label}</span>;
}

export function payTone(status: string): BadgeTone {
  if (status === "paid") return "good";
  if (status === "unpaid") return "bad";
  if (status === "partial" || status === "refund") return "warn";
  if (status === "overpaid") return "info";
  return "neutral";
}

export function orderTone(code: string): BadgeTone {
  if (code === "COMPLETED" || code === "ISSUED") return "good";
  if (code === "CANCELLED") return "bad";
  if (code === "IN_PRODUCTION" || code === "CONFIRMED") return "info";
  if (code === "NEW") return "warn";
  return "neutral";
}

export function jobTone(status: string): BadgeTone {
  if (status === "DONE") return "good";
  if (status === "IN_PROGRESS") return "info";
  if (status === "OPEN") return "warn";
  return "neutral";
}
