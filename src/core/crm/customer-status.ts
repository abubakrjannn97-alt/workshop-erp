import type { BadgeTone } from "@/components/status-badge";

export const CUSTOMER_STATUSES = ["NEW", "THINKING", "IN_PROCESS", "COMPLETED"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export function customerStatusLabel(status: CustomerStatus, t: (key: string) => string): string {
  return t(`crm.status.${status}`);
}

export function customerStatusTone(status: CustomerStatus): BadgeTone {
  if (status === "NEW") return "warn";
  if (status === "THINKING") return "neutral";
  if (status === "IN_PROCESS") return "info";
  return "success";
}

export function customerStatusSelectClass(status: CustomerStatus): string {
  return `statusTone${status}`;
}
