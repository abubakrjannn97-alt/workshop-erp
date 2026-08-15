export type OfflineActionType = "production.closeBatch";

export type QueuedAction = {
  id: string;
  type: OfflineActionType;
  payload: Record<string, string>;
  label: string;
  createdAt: string;
  retries: number;
  lastError?: string;
};

export type MeJobsSnapshot = {
  updatedAt: string;
  current: {
    batchId: string;
    productionOrderId: string;
    productName: string;
    customerName: string;
    plannedQty: string;
    producedQty: string;
    jobPlannedQty: string;
    unit: string;
    pct: number;
    materials: {
      materialId: string;
      plannedQty: string;
      name: string;
      symbol: string;
    }[];
  } | null;
  jobs: { id: string; title: string; href: string }[];
};
