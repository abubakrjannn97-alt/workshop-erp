export const CUSTOMER_STATUSES = ["NEW", "THINKING", "IN_PROCESS", "COMPLETED"] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number];

export function isCustomerStatus(value: string): value is CustomerStatus {
  return (CUSTOMER_STATUSES as readonly string[]).includes(value);
}

export function customerStatusLabel(status: CustomerStatus, t: (key: string) => string): string {
  return t(`crm.status.${status}`);
}

export function customerStatusTone(status: CustomerStatus): "orange" | "blue" | "green" | "gray" {
  if (status === "NEW") return "orange";
  if (status === "THINKING") return "gray";
  if (status === "IN_PROCESS") return "blue";
  return "green";
}
